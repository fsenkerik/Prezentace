-- ═══════════════════════════════════════════════════════════════════════
--  Rozdělovník prezentací — počáteční schéma
--
--  Spusť celý soubor v Supabase → SQL Editor → New query.
--  Je idempotentní jen zčásti, na čistý projekt ho pouštěj jednou.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Pomocné generátory ────────────────────────────────────────────────

-- Kód se diktuje nahlas ve třídě, proto abeceda bez znaků, které jdou
-- zaměnit: chybí 0/O, 1/I/L.
create or replace function public.gen_access_code(n int default 6)
returns text
language sql volatile as $fn$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
           1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n);
$fn$;

create or replace function public.gen_slug(n int default 10)
returns text
language sql volatile as $fn$
  select string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789',
           1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, n);
$fn$;

-- ─── Tabulky ───────────────────────────────────────────────────────────

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (btrim(name) <> ''),
  note        text,
  created_at  timestamptz not null default now()
);
create index classes_teacher_idx on public.classes (teacher_id);

create table public.topic_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (btrim(title) <> ''),
  description text,
  created_at  timestamptz not null default now()
);
create index topic_sets_teacher_idx on public.topic_sets (teacher_id);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references public.topic_sets(id) on delete cascade,
  position    int  not null default 0,
  title       text not null check (btrim(title) <> ''),
  description text,
  created_at  timestamptz not null default now()
);
create index topics_set_idx on public.topics (set_id, position);

create type public.assignment_status as enum ('draft', 'open', 'closed');

-- Sada témat přiřazená konkrétní třídě. Tady vzniká oddělená obsazenost:
-- stejná sada ve 3.A a 3.B jsou dvě různá přiřazení.
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_id      uuid not null references public.topic_sets(id) on delete restrict,
  class_id    uuid not null references public.classes(id)    on delete cascade,
  status      public.assignment_status not null default 'draft',
  slug        text not null unique default public.gen_slug(),
  access_code text not null default public.gen_access_code(),
  opens_at    timestamptz,
  closes_at   timestamptz,
  show_names  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (set_id, class_id)
);
create index assignments_teacher_idx on public.assignments (teacher_id);

create table public.selections (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  topic_id      uuid not null references public.topics(id)      on delete cascade,
  student_name  text not null,
  name_key      text not null,
  client_id     uuid,
  by_teacher    boolean not null default false,
  created_at    timestamptz not null default now(),

  -- Tyhle dva constrainty jsou celé jádro pravidla „kdo dřív přijde".
  -- Při souběžném zápisu uspěje právě jeden, ostatní dostanou 23505.
  constraint selections_topic_once   unique (assignment_id, topic_id),
  constraint selections_student_once unique (assignment_id, name_key)
);
create index selections_assignment_idx on public.selections (assignment_id);

-- Jeden prohlížeč smí v rámci přiřazení vybrat jen jednou.
-- Ruční zápisy učitele constraint obchází.
create unique index selections_device_once
  on public.selections (assignment_id, client_id)
  where client_id is not null and by_teacher = false;

-- Veřejné zrcadlo obsazenosti BEZ jmen. Jediná tabulka, na kterou vidí
-- anonymní role — díky tomu nemůže jméno uniknout přes WebSocket ani
-- při vypnutém show_names.
create table public.topic_locks (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  topic_id      uuid not null references public.topics(id)      on delete cascade,
  taken_at      timestamptz not null default now(),
  primary key (assignment_id, topic_id)
);

-- Ochrana proti hádání přístupového kódu.
create table public.claim_attempts (
  id         bigserial primary key,
  client_id  uuid,
  slug       text,
  ok         boolean not null,
  at         timestamptz not null default now()
);
create index claim_attempts_client_idx on public.claim_attempts (client_id, at desc);

-- ─── Zrcadlení obsazenosti ─────────────────────────────────────────────

create or replace function public.sync_topic_lock()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    insert into public.topic_locks (assignment_id, topic_id, taken_at)
    values (new.assignment_id, new.topic_id, new.created_at)
    on conflict do nothing;
  else
    delete from public.topic_locks
     where assignment_id = old.assignment_id
       and topic_id      = old.topic_id;
  end if;
  return null;
end $fn$;

create trigger selections_sync_lock
after insert or delete on public.selections
for each row execute function public.sync_topic_lock();

-- ─── Row Level Security ────────────────────────────────────────────────

alter table public.classes        enable row level security;
alter table public.topic_sets     enable row level security;
alter table public.topics         enable row level security;
alter table public.assignments    enable row level security;
alter table public.selections     enable row level security;
alter table public.topic_locks    enable row level security;
alter table public.claim_attempts enable row level security;

create policy teacher_owns_classes on public.classes
  for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy teacher_owns_sets on public.topic_sets
  for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy teacher_owns_topics on public.topics
  for all to authenticated
  using (exists (select 1 from public.topic_sets s
                  where s.id = topics.set_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from public.topic_sets s
                       where s.id = topics.set_id and s.teacher_id = auth.uid()));

create policy teacher_owns_assignments on public.assignments
  for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Učitel čte, ručně přiřazuje a uvolňuje výběry ve svých přiřazeních.
create policy teacher_reads_selections on public.selections
  for select to authenticated
  using (exists (select 1 from public.assignments a
                  where a.id = selections.assignment_id and a.teacher_id = auth.uid()));

create policy teacher_inserts_selections on public.selections
  for insert to authenticated
  with check (by_teacher and exists (select 1 from public.assignments a
                  where a.id = selections.assignment_id and a.teacher_id = auth.uid()));

create policy teacher_deletes_selections on public.selections
  for delete to authenticated
  using (exists (select 1 from public.assignments a
                  where a.id = selections.assignment_id and a.teacher_id = auth.uid()));

-- Obsazenost si smí přečíst kdokoli, pokud výběr není koncept.
create policy public_reads_locks on public.topic_locks
  for select to anon, authenticated
  using (exists (select 1 from public.assignments a
                  where a.id = topic_locks.assignment_id and a.status <> 'draft'));

-- claim_attempts nikdo přímo nečte, plní ho jen SECURITY DEFINER funkce.

-- Anonymní role nesmí do těchto tabulek vůbec sáhnout; zapisuje jen
-- přes claim_topic() níže.
revoke all on public.classes,
              public.topic_sets,
              public.topics,
              public.assignments,
              public.selections,
              public.claim_attempts
  from anon;
revoke insert, update, delete on public.topic_locks from anon, authenticated;
grant select on public.topic_locks to anon, authenticated;

-- ─── Realtime ──────────────────────────────────────────────────────────
-- Žáci poslouchají topic_locks (bez jmen), učitel navíc selections
-- (jména odfiltruje RLS — anonymní klient z této tabulky nedostane nic).

alter publication supabase_realtime add table public.topic_locks;
alter publication supabase_realtime add table public.selections;

-- ─── Veřejné RPC ───────────────────────────────────────────────────────

-- Hlavička výběru pro úvodní obrazovku — dostupná bez kódu, aby žák
-- viděl, kam se dostal, a případný odpočet do otevření.
create or replace function public.board_info(p_slug text)
returns json
language sql security definer stable set search_path = public as $fn$
  select json_build_object(
    'ok',          true,
    'title',       ts.title,
    'description', ts.description,
    'class_name',  c.name,
    'status',      a.status,
    'opens_at',    a.opens_at,
    'closes_at',   a.closes_at,
    'topic_count', (select count(*) from public.topics t where t.set_id = a.set_id),
    'taken_count', (select count(*) from public.topic_locks l where l.assignment_id = a.id)
  )
  from public.assignments a
  join public.topic_sets ts on ts.id = a.set_id
  join public.classes    c  on c.id  = a.class_id
  where a.slug = p_slug and a.status <> 'draft';
$fn$;

-- Plný seznam témat po ověření kódu.
create or replace function public.get_board(
  p_slug text, p_code text, p_client_id uuid default null)
returns json
language plpgsql security definer stable set search_path = public as $fn$
declare
  a public.assignments%rowtype;
  result json;
begin
  select * into a from public.assignments where slug = p_slug;
  if not found or a.status = 'draft' then
    return json_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if upper(btrim(coalesce(p_code, ''))) <> a.access_code then
    return json_build_object('ok', false, 'error', 'BAD_CODE');
  end if;

  select json_build_object(
    'ok',            true,
    'assignment_id', a.id,
    'title',         ts.title,
    'description',   ts.description,
    'class_name',    c.name,
    'status',        a.status,
    'opens_at',      a.opens_at,
    'closes_at',     a.closes_at,
    'show_names',    a.show_names,
    'my_selection',  (
      select json_build_object('topic_id', s.topic_id,
                               'student_name', s.student_name,
                               'created_at', s.created_at)
        from public.selections s
       where s.assignment_id = a.id
         and p_client_id is not null
         and s.client_id = p_client_id
       limit 1),
    'topics', coalesce((
      select json_agg(json_build_object(
               'id',          t.id,
               'title',       t.title,
               'description', t.description,
               'taken',       l.topic_id is not null,
               'taken_at',    l.taken_at,
               'taken_by',    case when a.show_names then s.student_name end)
             order by t.position, t.title)
        from public.topics t
        left join public.topic_locks l
               on l.assignment_id = a.id and l.topic_id = t.id
        left join public.selections s
               on s.assignment_id = a.id and s.topic_id = t.id
       where t.set_id = a.set_id), '[]'::json)
  ) into result
  from public.topic_sets ts
  join public.classes c on c.id = a.class_id
  where ts.id = a.set_id;

  return result;
end $fn$;

-- Jediná cesta, kterou se žák zapisuje. Kontroly stavu, kódu, termínů
-- i duplicit proběhnou v jedné transakci.
create or replace function public.claim_topic(
  p_slug text, p_code text, p_topic_id uuid,
  p_name text, p_client_id uuid default null)
returns json
language plpgsql security definer set search_path = public as $fn$
declare
  a        public.assignments%rowtype;
  v_name   text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_fails  int;
  v_constr text;
  v_title  text;
begin
  if char_length(v_name) < 3 then
    return json_build_object('ok', false, 'error', 'BAD_NAME');
  end if;

  if p_client_id is not null then
    select count(*) into v_fails
      from public.claim_attempts
     where client_id = p_client_id and not ok and at > now() - interval '5 minutes';
    if v_fails >= 10 then
      return json_build_object('ok', false, 'error', 'RATE_LIMITED');
    end if;
  end if;

  select * into a from public.assignments where slug = p_slug;

  if not found or a.status = 'draft' then
    insert into public.claim_attempts (client_id, slug, ok) values (p_client_id, p_slug, false);
    return json_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if upper(btrim(coalesce(p_code, ''))) <> a.access_code then
    insert into public.claim_attempts (client_id, slug, ok) values (p_client_id, p_slug, false);
    return json_build_object('ok', false, 'error', 'BAD_CODE');
  end if;
  if a.status = 'closed' then
    return json_build_object('ok', false, 'error', 'CLOSED');
  end if;
  if a.opens_at is not null and now() < a.opens_at then
    return json_build_object('ok', false, 'error', 'NOT_YET');
  end if;
  if a.closes_at is not null and now() > a.closes_at then
    return json_build_object('ok', false, 'error', 'CLOSED');
  end if;

  select t.title into v_title
    from public.topics t
   where t.id = p_topic_id and t.set_id = a.set_id;
  if not found then
    return json_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  insert into public.selections
    (assignment_id, topic_id, student_name, name_key, client_id)
  values
    (a.id, p_topic_id, v_name, lower(v_name), p_client_id);

  insert into public.claim_attempts (client_id, slug, ok) values (p_client_id, p_slug, true);
  return json_build_object('ok', true, 'topic_id', p_topic_id, 'topic_title', v_title);

exception
  when unique_violation then
    get stacked diagnostics v_constr = constraint_name;
    return json_build_object('ok', false, 'error',
      case v_constr
        when 'selections_topic_once'   then 'TOPIC_TAKEN'
        when 'selections_student_once' then 'ALREADY_PICKED'
        when 'selections_device_once'  then 'DEVICE_USED'
        else 'CONFLICT'
      end);
end $fn$;

revoke all on function public.board_info(text)            from public;
revoke all on function public.get_board(text, text, uuid) from public;
revoke all on function public.claim_topic(text, text, uuid, text, uuid) from public;
revoke all on function public.sync_topic_lock()           from public;

grant execute on function public.board_info(text)            to anon, authenticated;
grant execute on function public.get_board(text, text, uuid) to anon, authenticated;
grant execute on function public.claim_topic(text, text, uuid, text, uuid) to anon, authenticated;
