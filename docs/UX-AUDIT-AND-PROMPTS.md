# Diagnostika UI/UX, PWA a funkčnosti + tri prompty

Dátum auditu: 2026-10-29. Rozsah: `src/` (12 komponentov, 87 unit testov), `vite.config.ts`,
`vercel.json`, `index.html`, beh aplikácie v sandboxe.

Cieľ nebol „o 500 %“ — také číslo sa nedá overiť. Nižšie sú **konkrétne zistenia s dôkazom**
a tri prompty s **merateľnými akceptačnými kritériami**.

## Ako som to overoval

- Kód: čítanie komponentov, filtračnej logiky, service workera, manifestu, tokenov v `src/index.css`.
- Beh: pripojený preview, šírky 375 px (mobil), 768 px (tablet), 1280 px (desktop).
- Merania v DOM: dotykové ciele (`getBoundingClientRect`), reálne `font-size`, kontrast tokenov
  (WCAG vzorec), duplicity názvov, horizontálny overflow.
- Interakcie overené gestom: otvorenie/zatvorenie detailu projektu na mobile, otvorenie panela
  filtrov, prepnutie tabov, prázdny stav pri hľadaní bez zhody.
- **Neoverené:** reálny import z GitHubu/Vercelu (chýba token), inštalačný prompt a service worker
  v produkčnom režime (v dev je SW vypnutý), e2e sada (`npm run test:e2e`, chýbajú prehliadače).
- Testy v kontajneri: `npm run test:unit` → 87/87 prešlo. Konzola pri prechode appkou: 0 chýb.

## Silné stránky (nechať tak)

- Prístupnosť je riešená vážne: skip link, `aria-live` počet výsledkov, focus trap v detaili,
  `inert` pod splashom, `prefers-reduced-motion`, `aria-pressed` na filtroch.
- Žiadny horizontálny overflow na 375/768/1280; `scroll-y`/`scroll-x` utilities držia scroll v appke.
- Offline-first jadro existuje: IndexedDB, outbox, kompresia zálohy, update prompt, self-hosted fonty.
- Paleta má jeden zdroj pravdy (CSS premenné + Tailwind mapovanie), takže zmena vizuálu je lacná.

## Zistenia podľa priority

Čísla sú z merania, nie z odhadu.

| #   | Priorita | Zistenie                                          | Dôkaz                                                                                                                                                                                                                             |
| --- | -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | P0       | Zmiešaný jazyk v jednej obrazovke                 | 34 reťazcov so slovenskou diakritikou v `.tsx`; na obrazovke súčasne „Zdroje“, „Prepojenia“, „Nepripojené“, „Odpojiť“, „Obnoviť zdroje“ aj „Featured“, „Timeline“, „Open“, „All Filters“, „Clear all filters“, „Business purpose“ |
| F2  | P0       | Rovnaké projekty dvakrát na predvolenej obrazovke | V DOM 5+ duplicitných `<h3>`: Featured grid aj Timeline list vykresľujú tých istých 6 projektov; na mobile navyše tab „Featured“ opakuje sekciu z tabu „Timeline“                                                                 |
| F3  | P0       | Dotykové ciele pod 44 px                          | Pri 375 px: „Filters“ 32 px, „Obnoviť zdroje“ 28 px, „Exportovať lokálnu zálohu“ 28 px, čip „AI“ široký 42 px. Pri 1280 px 26 interaktívnych prvkov pod 44 px (čipy 30 px, „Sort“/„Zdroje“ 28 px, inputy 32/36 px)                |
| F4  | P1       | Tri rôzne vyhľadávacie vstupy                     | 4 `type="search"` v kóde: top bar desktop („Jump to project…“), sidebar („Search projects…“, 36 px), mobilný overlay („Search projects…“) — iné labely, iné správanie                                                             |
| F5  | P1       | Hľadanie beží aj na taboch, kde nič nefiltruje    | Pri aktívnom dotaze na tabe „Zdroje“ sa timeline filtruje neviditeľne; viditeľná spätná väzba je len `sr-only` „0 projects shown“                                                                                                 |
| F6  | P1       | Mikrotypografia                                   | 15× `text-[11px]`, 5× `text-[10px]` v kóde; na obrazovke 273 textových uzlov < 12 px (dominantne 11 px)                                                                                                                           |
| F7  | P1       | Kontrast na stlačenom stave karty                 | `--text-secondary` na `--bg-surface-3` = **4,39:1**, pod AA 4,5 pre bežný text; používa sa ako `active:bg-surface-3` na kartách (ostatné páry sú v norme: muted/app 5,89, muted/surface 5,28, primary/app 15,13)                  |
| F8  | P1       | Splash zdržuje prvý obsah                         | 800 ms čakanie na obrázok + 2000 ms hold + 250 ms fade = **2,25–3,05 s** na mobile/tableti pri studenom štarte; appka pod ním je `inert`                                                                                          |
| F9  | P1       | Štatistiky sú mŕtve čísla                         | „44 / 18 / 8 / 9“ v `StatsRow` nie sú interaktívne, hoci zodpovedajú existujúcim filtrom (Production, In Progress, kategórie)                                                                                                     |
| F10 | P1       | Destruktívna akcia bez potvrdenia                 | „Odpojiť“ v `SourceCard` odpojí zdroj okamžite; v celom `src/` nie je žiadne potvrdenie ani undo                                                                                                                                  |
| F11 | P2       | PWA nemá inštalačný a sieťový stav                | Žiadny `beforeinstallprompt` handler ani CTA; manifest bez `screenshots` a `shortcuts`; žiadny indikátor online/offline (`navigator.onLine` sa číta len pri spracovaní fronty, UI ho nezobrazuje)                                 |
| F12 | P2       | Detail má dve rozhrania bez spoločnej hlavičky    | Desktop `Inspector` (panel 320/384 px) vs mobil `MobileDetailPage`; obsah je zhodný (`ProjectDetail`), ale kontext, akcie a pozícia sa líšia                                                                                      |

## Tri prompty

Každý je samostatne použiteľný, pokrýva **UI/UX + PWA + funkčnosť** a vychádza z konkrétnych
zistení vyššie. Sú navrhnuté tak, aby sa dali spustiť v ľubovoľnom poradí, ale najlepší efekt je
**P1 → P2 → P3** (najprv hierarchia, potom tok a dôkazy, nakoniec offline vrstva).

---

### Prompt 1 — „Velín“: informačná architektúra a hustota timeline

> Si senior product designer a frontend inženýr. Uprav existujúcu React 18 + Vite + Tailwind PWA
> (osobný nástroj „H4CK3D Project Timeline“, tmavá paleta v CSS premenných `src/index.css`,
> komponenty v `src/components`). Spoločný rámec: rešpektuj existujúce tokeny a prístupnosť
> (WCAG 2.2 AA), nemeň CSP ani bezpečnostné hlavičky, nepridávaj runtime závislosti, kód píš v
> štýle repozitára a na konci spusti `npm run check`.
>
> **Cieľ:** dashboard má na prvý pohľad odpovedať „čo mám, v akom stave a čo je ďalšie“, bez
> opakovania obsahu a bez zmiešaného jazyka.
>
> **Oprav tieto konkrétne veci:**
>
> 1. Jazyk (F1). Zjednoť UI do jedného jazyka (odporúčam slovenčinu, zdrojové dáta nechaj tak).
>    Vytvor jeden slovník (napr. `src/lib/i18n.ts`) a odtiaľ ber všetky labely vrátane
>    „Featured/Timeline/Open/All Filters/Clear all filters/Business purpose/Technical purpose/
>    Category/Status/Visibility/Date/Stack/Risk level/Next step“. Zmiešané labely nesmú zostať.
> 2. Duplicita (F2). Na predvolenej obrazovke sa nesmie žiadny projekt zobraziť dvakrát:
>    vyber jednu reprezentáciu „Featured“ (napr. pás 3 kariet s odkazom „zobraziť všetky“)
>    a v timeline ho vizuálne odlíš, namiesto plného zopakovania. Mobilný tab „Featured“ nesmie
>    opakovať sekciu, ktorá je už v tabe „Timeline“.
> 3. Dotykové ciele (F3). Každý interaktívny prvok ≥ 44×44 px pri šírke ≤ 1023 px
>    (týka sa „Filters“, „Obnoviť zdroje“, „Exportovať lokálnu zálohu“, čipov a ikonových tlačidiel).
>    Na desktope zosúladiť výšky čipov a tlačidiel tak, aby riadok neposkakovali.
> 4. Typografia (F6). Minimálna veľkosť textu s obsahom 12 px; 11 px/10 px zostáva len pre mono
>    badge s kontrastom ≥ 4,5:1. Zjednoť škálu na 4–5 veľkostí a použi ju všade.
> 5. Kontrast (F7). Stlačený stav kariet nesmie znížiť kontrast textu pod 4,5:1 — uprav token
>    (`--bg-surface-3`) alebo text v aktívnom stave, nie celú paletu.
> 6. Jedno hľadanie (F4, F5). Jeden vyhľadávací vstup na breakpoint (rovnaký label, rovnaká
>    skratka ⌘K / Ctrl+K a `/`), a hľadanie sa nesmie tváriť ako aktívne na taboch, kde nič
>    nefiltruje — buď ho tam skry, alebo presmeruj na Timeline s viditeľným počtom výsledkov.
> 7. Štatistiky ako ovládanie (F9). Klikateľné čísla nastavia zodpovedajúci filter, aktívny stav
>    je viditeľný a zrušiteľný (napr. „Production 18“ → filter Production, znova klik zruší).
> 8. Prvý dojem. Nadpis, štatistiky a prvý rad kariet musia byť viditeľné bez scrollu na 375 px;
>    hlavička + bottom nav nech nezaberajú viac než ~120 px výšky.
>
> **PWA a funkčnosť v tomto prompte:** splash (F8) skráť na ≤ 1,2 s alebo ho nechaj preskočiteľný
> klikom/dotykom, aby neblokoval prvý obsah; stav „ukážkové údaje“ musí zostať čitateľný a nie
> tlačený pod splash; zmeny nesmú rozbiť offline štart (appka musí načítať dáta z IndexedDB bez
> siete) ani klávesnicové ovládanie.
>
> **Akceptačné kritériá (merateľné):**
>
> - 0 interaktívnych prvkov < 44×44 px pri 375 px a 768 px (meranie v DOM).
> - 0 duplicitných názvov projektov na predvolenej obrazovke (počet unikátnych názvov = počet kariet).
> - 1 vyhľadávací vstup na breakpoint; ⌘K/Ctrl+K aj `/` fungujú z každej obrazovky, Esc vymaže.
> - 0 textových uzlov < 12 px okrem mono badgeov s kontrastom ≥ 4,5:1.
> - Všetky kombinácie text/pozadie ≥ 4,5:1 (veľký text ≥ 3:1), overené výpočtom.
> - 0 horizontálneho overflow na 375/768/1280 px.
> - `npm run check` zelené; aktualizované unit testy pre nové štítky a počty.
>
> **Výstup:** zoznam zmien po komponentoch, nové/upravené testy, screenshot 375/768/1280 px
> a krátke vysvetlenie, prečo každé rozhodnutie rieši konkrétne zistenie (F1–F9).

---

### Prompt 2 — „Dôkaz“: detail projektu a onboarding zdrojov

> Si senior product designer a frontend inženýr. Uprav existujúcu React 18 + Vite + Tailwind PWA
> (osobný nástroj „H4CK3D Project Timeline“, tmavá paleta v CSS premenných `src/index.css`).
> Spoločný rámec: rešpektuj existujúce tokeny a prístupnosť (WCAG 2.2 AA), nemeň CSP ani
> bezpečnostné hlavičky, nepridávaj runtime závislosti, tokeny zostávajú len v pamäti a nikdy sa
> neukladajú do IndexedDB ani do súborov, na konci spusti `npm run check`.
>
> **Cieľ:** používateľ má z detailu pochopiť _odkiaľ_ údaj je a čo s ním môže urobiť, a pripojenie
> zdroja má byť riadený tok so spätnou väzbou — nie formulár, ktorý sa len „odosiela“.
>
> **Oprav tieto konkrétne veci:**
>
> 1. Dve rozhrania detailu (F12). Zjednoť hlavičku a poradie sekcií pre desktop panel aj mobilnú
>    stránku: názov + stav + primárna akcia hore, potom „prečo projekt existuje“, dôkazy, riziká,
>    ďalší krok. Sticky hlavička v mobilnom detaili musí vždy ukazovať názov projektu.
> 2. Pôvod údajov. Každé hodnotenie (maturity, risk, status) nesie viditeľnú známku pôvodu:
>    „ukážka“, „import YYYY-MM-DD“ alebo „odhad“ — v súlade s existujúcim upozornením
>    „Ukážkové údaje…“ a s pravidlom, že odhady nie sú audit.
> 3. Onboarding zdrojov. GitHub/Vercel/Lokálne dostanú spoločný 3-krokový sprievodca
>    (vybrať zdroj → zadať token/adresu → vybrať, čo importovať) s viditeľným pokrokom,
>    možnosťou vrátiť sa a bez straty zadaného tokenu pri chybe.
> 4. Chybové stavy importu. Rozlíš 401/403, rate-limit, sieťovú chybu a prázdny výsledok —
>    každý s jednou zrozumiteľnou vetou a akciou „Skúsiť znova“.
> 5. Destruktívna akcia (F10). „Odpojiť“ vyžaduje potvrdenie alebo ponúka undo do 5 s;
>    musí byť jasné, čo sa zmaže (importované projekty vs. roadmap).
> 6. Prázdne stavy. Detail bez pripojeného zdroja, zdroj bez projektov a zoznam bez výsledkov
>    majú vlastný text a jednu akciu — žiadne holé „Nepripojené“ bez vysvetlenia.
>
> **PWA a funkčnosť v tomto prompte:** detail projektu musí byť čitateľný offline z IndexedDB;
> import musí mať offline hlášku, ktorá nepôsobí ako zlyhanie appky; sprievodca musí byť použiteľný
> aj na 375 px (žiadny horizontálny scroll v inputoch); žiadna akcia nesmie zostať v stave
> „načítavam“ bez možnosti zrušiť.
>
> **Akceptačné kritériá (merateľné):**
>
> - Ten istý projekt má na desktope aj mobile rovnaké poradie sekcií (kontrola v DOM/testom).
> - Klávesnica: Tab/Shift+Tab prejde celý sprievodca, Esc ho zavrie, fokus sa vráti na spúšťacie
>   tlačidlo; čítačka oznámi každý krok (`aria-live`).
> - Každý chybový stav importu má vlastný text a akciu; zlyhanie nemaže už importované dáta.
> - Odpojenie zdroja: potvrdenie alebo undo ≤ 5 s, overené testom.
> - Po reloade nie je token v IndexedDB ani v localStorage (test alebo kontrola záznamov).
> - Detail sa vykreslí offline (reload bez siete) vrátane posledného importu.
> - `npm run check` zelené.
>
> **Výstup:** popis toku krok za krokom, nové komponenty, testy pre chybové stavy a offline detail,
> screenshoty sprievodcu na 375 px a desktop panelu.

---

### Prompt 3 — „Offline-first PWA“: inštalácia, stav siete a aktualizácie

> Si senior product designer a frontend inženýr so zameraním na PWA. Uprav existujúcu React 18 +
> Vite PWA (vlastný service worker `src/sw.ts` cez `vite-plugin-pwa` injectManifest, manifest vo
> `vite.config.ts`, tmavá paleta v CSS premenných). Spoločný rámec: zachovaj striktnú CSP a
> `connect-src` (GitHub/Vercel API + `localhost`), žiadne nové runtime závislosti, žiadne tretie
> strany (fonty a ikony sú self-hosted), na konci spusti `npm run check` a `npm run test:e2e`.
>
> **Cieľ:** appka sa má dať nainštalovať, má viditeľne komunikovať stav siete a aktualizácie a
> nesmie zdržiavať prvý obsah — bez toho, aby sa zmenilo bezpečnostné nastavenie.
>
> **Oprav tieto konkrétne veci:**
>
> 1. Inštalácia (F11). Zachyť `beforeinstallprompt`, ponúkni nenásilné CTA (napr. v „Zdroje“
>    alebo v pätičke nastavení) a po inštalácii ho skry (`display-mode: standalone`).
>    Pre iOS, kde udalosť neexistuje, zobraz krátky návod „Pridať na plochu“.
> 2. Manifest. Doplň `screenshots` (wide aj narrow, z reálnych obrazoviek), `shortcuts`
>    (Timeline, Featured, Zdroje) a over, že `id`, `start_url`, `scope`, `theme_color` a maskable
>    ikona sú konzistentné s obrazovkou.
> 3. Stav siete. Trvalý indikátor offline/online (nie modál) s časom poslednej úspešnej
>    synchronizácie a počtom čakajúcich úloh; pri obnovení spojenia ponúkni „Synchronizovať“ a
>    zobraz výsledok. Dnes `navigator.onLine` číta len fronta, UI ho nezobrazuje.
> 4. Aktualizácie. Zosúlaď existujúci `UpdatePrompt` s dizajnovým systémom a doplň pravidlo:
>    aktualizácia nesmie zmazať neuložené zmeny ani roadmap označenia.
> 5. Splash (F8). Skráť na ≤ 1,2 s alebo ho nechaj preskočiteľný; nikdy nesmie blokovať prvý
>    obsah dlhšie, než je potrebné na dekódovanie obrázka.
> 6. Offline prázdny stav. Pri štarte bez siete a bez uložených dát musí appka povedať, že ide
>    o offline štart, a ponúknuť „Skúsiť znova“ — nie prázdnu obrazovku.
>
> **UI/UX a funkčnosť v tomto prompte:** všetky nové stavové prvky používajú existujúce tokeny
> a škálu textu, majú `role="status"`/`aria-live` tam, kde sa mení stav, a nesmú prekrývať
> bottom nav ani safe-area; akcie musia byť dostupné klávesnicou a mať ≥ 44 px na dotyk.
>
> **Akceptačné kritériá (merateľné):**
>
> - `npm run build && npm run preview`: Lighthouse (alebo `chrome://` manifest check) hlási
>   inštalovateľnosť, manifest má `screenshots` aj `shortcuts`.
> - Offline reload načíta appku a posledné dáta (existujúci e2e `offline.spec.ts` musí prejsť).
> - Pri vypnutej sieti sa do 1 s zobrazí offline indikátor a po zapnutí zmizne bez reloadu.
> - Splash ≤ 1,2 s alebo preskočiteľný; prvý obsah interaktívny do 1 s od studeného štartu
>   na 375 px.
> - Update prompt sa zobrazí pri novej verzii a po potvrdení sa appka načíta s novou verziou.
> - `npm run check` aj `npm run test:e2e` zelené; CSP v `vercel.json` nezmenené.
>
> **Výstup:** zmeny v `vite.config.ts` (manifest), `src/sw.ts` (ak treba), nové UI stavy,
> aktualizované testy, screenshot inštalačnej ponuky a offline indikátora.

## Poznámky k použitiu

- Prompty predpokladajú, že agent má prístup k repozitáru a môže spustiť `npm run check`; bez toho
  sú akceptačné kritériá overiteľné len manuálne.
- Ak sa má spustiť len jeden prompt, P1 rieši najviac viditeľných problémov (jazyk, duplicita,
  dotykové ciele, typografia).
- Percentuálne ciele („+500 %“) zámerne nahradili merateľné kritériá — dajú sa overiť v DOM,
  v testoch a vo výstupe Lighthouse, na rozdiel od subjektívneho percenta.
