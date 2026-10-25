# Funkcie

## Timeline

- Projekty zoskupené podľa roku a mesiaca, sticky hlavička roka.
- Štatistiky: celkový počet, Production, in progress, počet kategórií.
- **Featured** sekcia (max 6 na hlavnej stránke, všetky v mobilnom tabe Featured). Skryje sa pri aktívnych filtroch.
- Prázdny stav s tlačidlom „Clear all filters“.

## Vyhľadávanie a filtre

- Fulltext cez názov, popis, kategóriu, repo a tech stack. Bez diakritiky a veľkosti písmen, viac slov = AND.
- Filtre: kategória (9), status (4), visibility (3), „Featured only“, triedenie Newest/Oldest.
- Klávesové skratky: **⌘K / Ctrl+K** alebo **/** → focus na vyhľadávanie, **Esc** → vymaže/zavrie.
- Desktop: ľavý sidebar. Mobil: vodorovný riadok čipov + rozbaľovací panel „All Filters“.

## Detail projektu

- Desktop: pravý panel (Inspector). Mobil: celoobrazovková stránka so slide-in animáciou; systémové tlačidlo Späť ju zatvorí.
- Meta údaje, maturity (1–5), risk, stack, business/technical purpose, next step.
- Prepojenia: GitHub repo, Vercel URL + stav nasadenia, lokálna cesta. Text detailu sa dá označiť a kopírovať.

## Zdroje (GitHub, Vercel, Lokálne)

- **GitHub:** PAT token → načítanie všetkých repozitárov (stránkovanie, max 3 000), filter private/archived/forks, výber a import.
- **Vercel:** token (+ voliteľné Team ID) → projekty, produkčná URL, stav deploymentu.
- **Lokálne:** cez [lokálny skener](LOCAL-SCANNER.md) na `http://localhost:3001`.
- Spájanie do jednej karty: najprv podľa GitHub repa (`owner/repo`), potom podľa jednoznačného kompatibilného názvu.
- Importované projekty sa ukladajú do `localStorage` (bez tokenov) a prežijú reload aj offline štart.

## Úvodná obrazovka (mobil/tablet < 1024 px)

- Statické pozadie (kovové hexagony, `public/splash/metal.webp`), 45 % tmavý závoj, logo s mikroanimáciou `--H4CK3D--` (dekódovanie znakov, kurzor), pruh 2 s.
- **Kedy:** pri studenom štarte (appka úplne zatvorená) alebo po návrate z pozadia po ≥ 60 min. Pri reloade nie. Na desktope nikdy (obrázok sa ani nestiahne).
- Časovanie: čakanie na obrázok max 800 ms → 2000 ms → fade 250 ms (0 ms pri „obmedziť pohyb“). Spolu 2,25–3,05 s.
- Čítačka obrazovky: „Načítavam H4CK3D Project Timeline“. Appka pod ním je `inert`.

## PWA

- Inštalovateľná (manifest, ikony vrátane maskable a Apple touch), offline cez service worker.
- Toast „Nová verzia je pripravená“ → Aktualizovať; kontrola aktualizácie každú hodinu.
- Natívny layout bez bounce; pinch a klávesový zoom zostávajú dostupné aj v nainštalovanej PWA.

## Prístupnosť

Skip link, dialógy s focus trapom a návratom focusu, `aria-pressed` na čipoch, `role="switch"`, live región s počtom výsledkov, `prefers-reduced-motion`.
