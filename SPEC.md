# Aplikace na výběr prezentací — specifikace v1

Webová aplikace, kde si žáci v reálném čase rozebírají témata prezentací
podle principu „kdo dřív přijde, ten dřív mele". Učitel témata spravuje,
přiřazuje třídám a sleduje živý přehled výběrů.

## 1. Rozhodnutí (schváleno)

| Téma | Rozhodnutí |
|---|---|
| Identifikace žáka | Bez přihlášení — žák zadá jméno + přístupový kód výběru |
| Kapacita tématu | 1 žák = 1 téma, po odeslání okamžitě uzamčeno |
| Změna volby | Finální; odblokovat může pouze učitel |
| Rozsah | 1 učitel, jednotky tříd, do ~100 žáků → free tier |
| Obsazenost napříč třídami | Oddělená (3.A nevidí výběry 3.B); přepínatelné na sdílenou |

## 2. Technologie

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
- **Backend + DB:** Supabase — Postgres, Realtime, Auth (jen pro učitele)
- **Hosting:** Vercel (free) + Supabase (free), doména `*.vercel.app`
- **Repozitář:** GitHub, automatický deploy z větve `main`

Proč Supabase: atomicitu výběru řeší `UNIQUE` constraint v Postgresu.
Při souběžném kliknutí uspěje právě jeden zápis, ostatní dostanou
srozumitelnou chybu. Aplikační logika by tuto záruku nedala.

## 3. Datový model

```
teacher (auth.users)
 ├─< class          3.A, 3.B, 3.C
 ├─< topic_set ──< topic        sada témat + jednotlivá témata
 └─< assignment                 sada × třída + pravidla a termíny
        └─< selection           téma × jméno žáka
```

Klíč k návrhu: **témata patří sadě, obsazenost patří přiřazení.**
Jednu sadu 25 témat přiřadíš 3.A, 3.B i 3.C a každá třída si vybírá
nezávisle na ostatních.

### 3.1 SQL schéma

```sql
create table classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create table topic_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table topics (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references topic_sets(id) on delete cascade,
  position    int  not null default 0,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create type assignment_status as enum ('draft', 'open', 'closed');

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references auth.users(id) on delete cascade,
  set_id       uuid not null references topic_sets(id) on delete restrict,
  class_id     uuid not null references classes(id)    on delete cascade,
  status       assignment_status not null default 'draft',
  slug         text not null unique,          -- veřejná adresa /v/<slug>
  access_code  text not null,                 -- 6 znaků, diktuje se ve třídě
  opens_at     timestamptz,                   -- fér start pro všechny naráz
  closes_at    timestamptz,                   -- automatické uzavření
  show_names   boolean not null default true, -- vidí žáci jména u témat?
  created_at   timestamptz not null default now(),
  unique (set_id, class_id)
);

create table selections (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references assignments(id) on delete cascade,
  topic_id       uuid not null references topics(id)      on delete cascade,
  student_name   text not null,
  name_key       text not null,   -- normalizované jméno pro kontrolu duplicit
  client_id      uuid,            -- identifikátor prohlížeče z localStorage
  by_teacher     boolean not null default false,
  created_at     timestamptz not null default now(),

  -- jedno téma smí být v rámci přiřazení obsazeno jen jednou
  unique (assignment_id, topic_id),
  -- jeden žák smí mít v rámci přiřazení jen jedno téma
  unique (assignment_id, name_key)
);

create index on selections (assignment_id);
```

### 3.2 Atomický výběr

Zápis probíhá výhradně přes `SECURITY DEFINER` funkci, která v jedné
transakci ověří stav přiřazení, kód, termíny i duplicity:

```sql
create or replace function claim_topic(
  p_slug text, p_code text, p_topic_id uuid,
  p_name text, p_client_id uuid
) returns json
language plpgsql security definer as $fn$
declare a assignments%rowtype;
begin
  select * into a from assignments where slug = p_slug;
  if not found                      then return json_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if a.access_code <> upper(p_code) then return json_build_object('ok', false, 'error', 'BAD_CODE');  end if;
  if a.status <> 'open'             then return json_build_object('ok', false, 'error', 'NOT_OPEN');  end if;
  if a.opens_at  is not null and now() < a.opens_at  then return json_build_object('ok', false, 'error', 'NOT_YET'); end if;
  if a.closes_at is not null and now() > a.closes_at then return json_build_object('ok', false, 'error', 'CLOSED');  end if;

  insert into selections (assignment_id, topic_id, student_name, name_key, client_id)
  values (a.id, p_topic_id, btrim(p_name), lower(btrim(p_name)), p_client_id);

  return json_build_object('ok', true);
exception
  when unique_violation then
    -- rozliší, zda bylo zabrané téma, nebo už žák jednou vybíral
    return json_build_object('ok', false, 'error',
      case when sqlerrm like '%topic%' then 'TOPIC_TAKEN' else 'ALREADY_PICKED' end);
end $fn$;
```

### 3.3 Zabezpečení (RLS)

- Anonymní role **nemá** přímý `INSERT` do `selections`, jen přes `claim_topic`.
- Anonymní `SELECT` běží přes view `public_selections`, které vrací
  `topic_id` a jméno pouze tehdy, když `show_names = true`.
- Učitel vidí a mění výhradně vlastní řádky (`teacher_id = auth.uid()`).
- Rate limit: max 5 pokusů o výběr za minutu na `client_id`.

## 4. Realtime

1. Žák otevře `/v/<slug>`, načte témata a aktuální obsazenost.
2. Klient se přihlásí k Supabase Realtime kanálu pro dané `assignment_id`.
3. Kdokoli vybere → `INSERT` → ostatním klientům přijde událost během ~100 ms.
4. Klient si na událost dotáhne `public_selections` a téma zešedne
   a přeškrtne. Refetch místo použití payloadu proto, aby při
   `show_names = false` neunikla jména přes WebSocket.

**Pojistky:** optimistic UI (vlastní karta reaguje okamžitě), plný refetch
při každém reconnectu, fallback polling à 15 s, indikátor stavu spojení.

## 5. Obrazovky

### Učitel — `/app`

- **Třídy:** vytvoření, přejmenování, poznámka
- **Sady témat:** editor, hromadné vložení témat ze schránky (řádek = téma),
  změna pořadí, duplikace celé sady
- **Přiřazení:** sada → třída, nastavení `opens_at` / `closes_at`,
  přepínač zobrazení jmen, generování kódu, QR kód a odkaz na projektor
- **Živý přehled:** tabulka téma → žák → čas, seznam „ještě nevybrali",
  ruční přiřazení tématu, uvolnění tématu, export CSV/XLSX
- **Ovládání běhu:** `draft` → `open` → `closed`, odpočet do otevření

### Žák — `/v/<slug>` (veřejné, mobil first)

1. Zadání jména + přístupového kódu
2. Seznam témat: volná zvýrazněná, obsazená šedá a přeškrtnutá,
   vyhledávání, filtr „jen volná", počítadlo „zbývá 12 z 25"
3. Potvrzovací dialog („Opravdu? Volbu už nepůjde změnit.")
4. Potvrzení s vybraným tématem; seznam zůstává viditelný v reálném čase

**Stavy k ošetření:** výběr ještě neotevřen (odpočet), uzavřen,
téma zabráno mezi zobrazením a klikem, jméno už vybíralo, ztráta spojení.

## 6. Mimo rozsah v1 (kandidáti na později)

- Skupinová témata s kapacitou 2–5 míst
- Režim preferencí (žák seřadí top 3, algoritmus rozdělí spravedlivě)
- Účty žáků s osobním kódem místo volného jména
- Více učitelů a role správce školy
- E-mailové notifikace a připomínky před deadlinem

## 7. Postup prací

1. Nastavení Supabase projektu, migrace schématu, RLS a `claim_topic`
2. Kostra Next.js, klient Supabase, autentizace učitele
3. Učitelské rozhraní (třídy, sady, přiřazení)
4. Žákovský výběr včetně realtime vrstvy
5. Živý přehled a export
6. Napojení frontendu z Claude Design
7. Deploy na Vercel, test se skutečnou třídou
