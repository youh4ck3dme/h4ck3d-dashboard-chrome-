# Changelog

## Offline-first vrstva — 2026-10-25

- IndexedDB v1, idempotentná migrácia legacy importov a Roadmap, ochrana pred chybou kvóty.
- Optimistic overrides, logické LWW revízie, stabilné identity a koordinácia kariet.
- Read-only refreshy, pamäťové credentials, trvalá local queue, backoff/Retry-After, generation a lease fencing.
- Vlastný injectManifest worker zachováva offline shell a prompt aktualizácie.
- Lokálna gzip/JSON záloha, explicitný stav uloženia a dokumentované limity cross-device/background sync.

## Produkčné spevnenie — 2026-10-25

- Import do `youh4ck3dme/h4ck3d-dashboard-timeline`; aktualizované návody a AGENTS.md.
- Opravené zraniteľné závislosti (audit 10 → 0).
- Prísna runtime validácia API/localStorage, timeouty, abort, bezpečné stránkovanie a URL.
- Opravené identity pri rovnakých názvoch rôznych repo vlastníkov; ukážky oddelené od importov.
- Loopback scanner Host/Origin ochrana, sanitizácia credentials a zlúčenie súbežných skenov.
- Persistencia Roadmap, dostupný zoom a opravený kontrast.
- 58 unit/component testov + 8 HTTP testov + 16 lokálnych desktop/mobile browser scenárov.
- CI Node 22/24 a Chromium/WebKit; podrobné limity v PRODUCTION-READINESS.md.

## 1.0.0 — 2026-10-24

### Pridané

- PWA: manifest, ikony, service worker, offline, toast aktualizácie.
- Úvodná obrazovka pre mobil/tablet (studený štart alebo po 60 min v pozadí) s mikroanimáciou `--H4CK3D--`.
- Lokálny skener projektov (`npm run server`).
- Perzistencia importovaných zdrojov, skratka ⌘K / Ctrl+K / „/“.
- Bezpečnostné hlavičky a CSP (`vercel.json`), CI workflow, 38 testov.
- Dokumentácia v `docs/`.

### Opravené

- 22 TypeScript chýb (vrátane chybného typu ikony v `SourceCard`).
- Zastaraný `ReactDOM.render` → `createRoot` + `StrictMode`.
- Falošné priradenie kategórie „AI“ (napr. „email“, „detail“).
- Neplatný default rate-limitu GitHubu, chýbajúca validácia odpovedí lokálneho servera.

### Zmenené

- Fonty self-hosted namiesto Google Fonts.
- Zoom blokovaný iba v nainštalovanej PWA.
- Zdieľaný komponent filtrov pre sidebar a mobil.
