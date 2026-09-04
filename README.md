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

## Na co si dát pozor

- **Volba je konečná.** Žák si ji nevrátí, uvolnit téma může jen učitel.
- **Žáci se nepřihlašují.** Aplikace proto nezná jmenný seznam třídy
  a neumí říct, kdo ještě nevybral — jen kdo už vybral.
- **Z jednoho zařízení proběhne jeden výběr.** Když si dva žáci půjčí
  stejný telefon, druhý dostane hlášku a učitel mu téma přiřadí ručně.
