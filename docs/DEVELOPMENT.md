# Vývoj

## Požiadavky

Node ≥ 22.12 (odporúčané 22, viď `.nvmrc`), npm.

## Štart

```bash
npm ci
npm run dev        # http://localhost:5173
npm run server     # voliteľné: lokálny skener na http://127.0.0.1:3001
```

## Skripty

| Príkaz                    | Popis                                                         |
| ------------------------- | ------------------------------------------------------------- |
| `dev`                     | Vite dev server                                               |
| `build`                   | `tsc --noEmit` + `vite build` (SW, manifest)                  |
| `preview`                 | náhľad buildu s produkčnými hlavičkami z `vercel.json`        |
| `typecheck`               | TypeScript bez emitu                                          |
| `lint`                    | ESLint 9 flat config, `--max-warnings 0`                      |
| `format` / `format:check` | Prettier (+ triedenie Tailwind tried)                         |
| `test` / `test:watch`     | Vitest (jsdom) + HTTP testy skenera (`test:watch` len Vitest) |
| `check`                   | všetko vyššie — to isté ako CI                                |
| `icons`                   | pregeneruje ikony z `public/favicon.svg`                      |
| `server`                  | lokálny skener                                                |

Voliteľne `SOURCEMAP=true npm run build` vygeneruje skryté source mapy (napr. pre error tracker).

## Testy

- `src/lib/filter.test.ts` — filtrovanie, triedenie, vyhľadávanie bez diakritiky, zoskupenie, neplatné dátumy.
- `src/lib/sources.test.ts` — `normalizeRepoKey`, kategórie, status/maturity, merge GitHub+Vercel+Local, `safeExternalUrl`.
- `src/lib/splashPolicy.test.ts` — studený štart, reload, hranica 60 min, poškodené úložisko.
- `src/components/WelcomeScreen.test.tsx` — desktop bez obrázka, mobil 800 ms fallback, reduced motion, reload, návrat z pozadia.
- `src/App.test.tsx` — render timeline, prázdny stav, otvorenie inspectora.

## Konvencie

- Pomenované exporty, `import type` pre typy (vynútené ESLintom), žiadne `any`.
- Odkazy z externých dát vždy cez `safeExternalUrl`.
- Nové trvalé dáta cez `offline/db.ts`; priamy localStorage prístup je vyhradený validovanej migrácii a fallback signálu koordinácie.
- Nové farby len cez CSS premenné v `index.css` / `tailwind.config.js`.

## Úprava úvodnej obrazovky

- Obrázok: nahraď `public/splash/metal.webp` (9:16, ideálne ≥ 1080×1920, WebP q≈82).
- Časy: konštanty v `src/hooks/useWelcomeScreen.ts`; interval znovuprehratia `RESUME_AFTER_MS` v `src/lib/splashPolicy.ts`.
- Rýchlosť dekódovania nicku: `STEP_MS` v `src/components/WelcomeScreen.tsx`.

## Browser scenáre

Po `npm run build` nainštaluj browser binárky cez `npx playwright install chromium webkit` a spusti `TEST_WEBKIT=1 npm run test:e2e`. Testy samy spustia preview na 4173 a lokálny skener na 3001 s deterministickým fixture adresárom; tieto porty musia byť voľné. GitHub/Vercel odpovede sú kontrolované mocky, lokálny import používa skutočný HTTP skener. CI pridáva WebKit/iPhone emuláciu. Skutočné Safari/iOS zariadenie sa tým nenahrádza.

`src/lib/api.test.ts` overuje API chyby, stránkovanie, schému, identitu a corrupt storage; `server/local-scanner.test.mjs` overuje HTTP/CORS/Host, read-only metódy, discovery a odstránenie remote credentials. `npm run check` tiež kontroluje audit závislostí.

Offline testy: `src/offline/db.test.ts` používa fake-indexeddb na migráciu, transakcie, logické revízie a fencing/retry; `compression.test.ts` používa natívne Node streams a meria bajty. `e2e/offline.spec.ts` overuje skutočné browser IndexedDB, viac kariet, offline štart a worker execution. Test worker message nepredstiera prirodzené doručenie native Background Sync.
