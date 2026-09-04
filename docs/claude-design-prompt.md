# Prompt pro Claude Design

Zkopíruj celý blok níže do Claude Design. Vznikne canvas s deseti artboardy,
který pak zapracuji do Next.js aplikace podle `SPEC.md`.

---

Navrhni rozhraní pro webovou aplikaci **Rozdělovník prezentací** — středoškolští
žáci si v ní v reálném čase rozebírají témata prezentací systémem „kdo dřív
přijde". Jakmile si někdo téma vezme, všem ostatním okamžitě zešedne a přeškrtne
se, bez načtení stránky. Učitel témata spravuje a sleduje živý přehled.

Aplikace je celá v češtině. Žákům tykej, s učitelem mluv věcně.

## Technická omezení

Výstup bude implementovaný v Reactu s Tailwindem a komponentami shadcn/ui.
Drž se proto standardních vzorů: karty, dialogy, tabulky, badge, toasty,
tlačítka ve variantách default/secondary/ghost/destructive. Žádné animace,
které by nešly udělat CSS transicí. Navrhni světlý i tmavý režim.

## Vizuální směr

Školní prostředí, ale ne dětské — čisté, klidné, soustředěné, blíž
produktivnímu nástroji než hravé appce. Jedna akcentní barva pro akce,
neutrální šedá škála pro zbytek. Bezpatkové písmo, výrazná hierarchie
velikostí, štědrý vzdušný prostor mezi kartami témat.

**Nejdůležitější vizuální úkol:** rozdíl mezi volným a obsazeným tématem musí
být čitelný na dva metry od telefonu a jedním pohledem. Nespoléhej jen na
barvu — obsazené téma kombinuje ztlumení, přeškrtnutý název a ikonu zámku,
volné má plný kontrast a zřetelné tlačítko. Barvoslepý žák musí poznat rozdíl.

## Artboardy — žák (mobil, 390 × 844)

Žáci to otevřou na telefonu ve třídě, často na horším wi-fi. Mobil je hlavní
zařízení, ne odvozenina z desktopu.

**1. Vstup do výběru**
Název sady („Dějepis 20. století"), třída (3.A), počet volných témat.
Pole pro jméno a pole pro šestimístný přístupový kód (velká písmena a číslice,
učitel ho diktuje). Tlačítko „Pokračovat". Upozornění, že volba je konečná.

**2. Seznam témat — hlavní obrazovka**
Přilepená hlavička: název sady, počítadlo „zbývá 12 z 25", tečka indikující
živé spojení. Pod ní vyhledávací pole a přepínač „jen volná". Pak seznam
karet témat — každá má název, krátký popis a stav. Ukaž na jednom artboardu
obě varianty karty vedle sebe: volnou s tlačítkem „Vybrat" a obsazenou
s přeškrtnutým názvem a jménem toho, kdo si ji vzal.

**3. Potvrzovací dialog**
Modální okno s vybraným tématem a jasným varováním, že volbu už nepůjde
změnit. Dvě tlačítka: „Zpět" a potvrzení.

**4. Po odeslání**
Nahoře výrazný panel „Tvoje téma: …" s časem výběru. Pod ním pokračuje
seznam ostatních témat, který se dál živě aktualizuje — žák vidí, jak
ubývají. Žádné tlačítko „Vybrat" už není aktivní.

**5. Ještě neotevřeno**
Výběr se otevírá v určený čas, aby všichni startovali naráz. Velký odpočet
do otevření, název sady, klidné sdělení „Výběr se otevře v 8:00".

**6. Chybové a mezní stavy**
Na jednom artboardu ukaž vedle sebe čtyři varianty:
- „Téma si právě vzal někdo jiný" (nastane mezi zobrazením a klikem)
- „Pod tímto jménem už někdo vybíral"
- „Výběr je uzavřený"
- ztráta spojení — nenápadný pruh „Obnovuji spojení…"

## Artboardy — učitel (desktop, 1440 × 1024)

**7. Přehled**
Levý navigační sloupec: Přehled, Třídy, Sady témat, Výběry. V obsahu dlaždice
probíhajících výběrů — třída, sada, stav (koncept / otevřeno / uzavřeno),
postup „18 z 24 vybralo" a rychlé akce.

**8. Editor sady témat**
Seznam témat s pořadím a možností přetažení, inline úprava názvu a popisu.
Tlačítko pro hromadné vložení ze schránky (jeden řádek = jedno téma).
V postranním panelu informace, kterým třídám je sada přiřazená.

**9. Detail výběru — živý přehled**
Tohle je nejdůležitější učitelská obrazovka. Nahoře ovládání běhu
(koncept → otevřeno → uzavřeno), čas otevření a uzávěrky, přepínač
zobrazování jmen žákům, tlačítko exportu.
Hlavní plocha: tabulka téma → žák → čas výběru, u obsazených řádků akce
„uvolnit téma". Vedle ní panel „Ještě nevybrali" se seznamem jmen
a možností přiřadit téma ručně.

**10. Projektorový režim**
Určeno k promítnutí na plátno, čte se z dálky. Obrovský QR kód, pod ním
adresa a přístupový kód velkým písmem, a velké počítadlo zbývajících témat,
které se živě snižuje. Minimum ostatního obsahu.

## Přístupnost

Kontrast textu alespoň 4,5 : 1 v obou režimech, dotykové cíle minimálně
44 × 44 px, viditelný focus ring na všech interaktivních prvcích, stav tématu
sdělený i tvarem a ikonou, nejen barvou.
