# Rozdělovník prezentací

Žáci si v reálném čase rozeberou témata prezentací. Kdo dřív přijde,
ten dřív mele — jakmile si někdo téma vezme, ostatním okamžitě zešedne
a přeškrtne se, bez načtení stránky.

Návrh a rozhodnutí jsou v [SPEC.md](SPEC.md).

## Zprovoznění

### 1. Databáze

V Supabase otevři **SQL Editor → New query**, vlož celý obsah
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
a spusť. Vytvoří tabulky, RLS politiky, realtime publikaci a funkci
`claim_topic`, která hlídá, aby jedno téma dostal právě jeden žák.
Pak stejně spusť i [`0002_class_size.sql`](supabase/migrations/0002_class_size.sql).

Pak v **Authentication → Sign In / Providers** nech zatím zapnuté
zakládání účtů, ať si můžeš vytvořit svůj, a hned potom ho vypni —
žáci se nepřihlašují, další účty nikdo nepotřebuje.

### 2. Lokální běh

```bash
npm install
npm run dev
```

Přihlašovací údaje k Supabase se berou z `.env.local`
(vzor je v `.env.example`).

### 3. Nasazení na Vercel

Naimportuj repozitář, přidej obě proměnné z `.env.example` a nasaď.
Nic dalšího není potřeba — aplikace nemá vlastní server, mluví přímo
se Supabase.

## Jak se to používá

1. **Třídy** — založ 3.A, 3.B, 3.C
2. **Sady témat** — napiš seznam témat jednou; hromadné vložení bere
   jeden řádek jako jedno téma, popis odděl pomlčkou
3. **Přehled → Nový výběr** — spoj sadu s třídou. Tutéž sadu můžeš dát
   všem třem třídám, každá má vlastní obsazenost
4. V detailu výběru nastav čas otevření, promítni **projektorový režim**
   s QR kódem a přepni stav na **Otevřít**
5. Sleduj živý přehled, případně uvolni téma nebo přiřaď ručně

## Design

Vzhled vychází z návrhu v [`Design/`](Design) — canvas z Claude Design
včetně jeho design systému „Industry". Tokeny a komponentní třídy jsou
převzaté do [`src/app/design-system.css`](src/app/design-system.css);
tenhle soubor je zdroj pravdy pro barvy, typografii i tvar komponent.
Tailwind se používá jen na rozvržení.

Když budeš chtít vzhled doladit, uprav tokeny nahoře v `design-system.css`,
ne jednotlivé stránky.

## Na co si dát pozor

- **Volba je konečná.** Žák si ji nevrátí, uvolnit téma může jen učitel.
- **Žáci se nepřihlašují.** Aplikace proto nezná jmenný seznam třídy
  a neumí říct, kdo ještě nevybral — jen kdo už vybral.
- **Z jednoho zařízení proběhne jeden výběr.** Když si dva žáci půjčí
  stejný telefon, druhý dostane hlášku a učitel mu téma přiřadí ručně.

## Nasazení na Vercel

1. **vercel.com → Add New → Project** a naimportuj repozitář `Prezentace`.
   Next.js Vercel rozpozná sám, nastavení stačí nechat výchozí.
2. V **Environment Variables** přidej obě hodnoty z `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   `ALLOW_SIGNUP` **nepřidávej** — zakládání účtů má zůstat zavřené.
3. **Deploy.**
4. V Supabase → **Authentication → URL Configuration** nastav *Site URL*
   na adresu z Vercelu, ať odkazy v e-mailech nemíří na localhost.
5. Tamtéž v **Sign In / Providers** vypni *Allow new users to sign up*.

Od té chvíle se každý push do `main` nasadí sám.

### Zakládání účtů

Tlačítko „Založit účet" se ukáže jen když je `ALLOW_SIGNUP=true`.
Aplikace musí být veřejná kvůli žákům, takže bez téhle pojistky by si
účet vyučujícího mohl založit kdokoli, kdo najde adresu.
