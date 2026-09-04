-- Oprava: politika na topic_locks se ptala přímo do assignments, jenže
-- podmínka RLS běží pod právy volající role a anonymní role k assignments
-- přístup nemá (a mít nesmí — je tam přístupový kód). Anonymní klient tak
-- nepřečetl obsazenost a nedostával realtime události.
--
-- Kontrolu proto dělá SECURITY DEFINER funkce, která vrací jen ano/ne.

create or replace function public.assignment_is_public(p_assignment uuid)
returns boolean
language sql security definer stable set search_path = public as $fn$
  select exists (
    select 1
      from public.assignments a
     where a.id = p_assignment
       and a.status <> 'draft');
$fn$;

revoke all on function public.assignment_is_public(uuid) from public;
grant execute on function public.assignment_is_public(uuid) to anon, authenticated;

drop policy if exists public_reads_locks on public.topic_locks;

create policy public_reads_locks on public.topic_locks
  for select to anon, authenticated
  using (
    public.assignment_is_public(assignment_id)
    -- Učitel vidí i zámky svých konceptů, kdyby v nich ručně přiřazoval.
    or exists (select 1 from public.assignments a
                where a.id = topic_locks.assignment_id
                  and a.teacher_id = auth.uid())
  );
