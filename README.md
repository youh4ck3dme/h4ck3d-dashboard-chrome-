# H4CK3D Dashboard Timeline

React/TypeScript PWA pre spoločnú časovú os GitHub, Vercel a lokálnych projektov.

## Spustenie

Node.js 22.12+ (alebo 24+) a npm. Na Macu stačí existujúci Node; Docker netreba.

```bash
git clone https://github.com/youh4ck3dme/h4ck3d-dashboard-timeline.git
cd h4ck3d-dashboard-timeline
npm ci
npm run dev
```

Otvoriť `http://localhost:5173`. Bez pripojených zdrojov sa zobrazujú **výslovne označené ukážkové údaje**. Prvý skutočný import ukážky nahradí. Metadáta a odvodené odhady vyspelosti/rizika nie sú auditom zdrojových projektov.

## Overenie pred vydaním

```bash
npm run check
npx playwright install chromium webkit
TEST_WEBKIT=1 npm run test:e2e
```

`check` kontroluje formát, lint bez varovaní, TypeScript aplikácie aj konfigurácií/testov, unit testy, HTTP integračné testy skenera, produkčný build a audit závislostí. Browser testy používajú produkčný build s CSP; zahŕňajú mobil/desktop, prístupnosť, import, chyby, persistenciu a offline reload. Výsledky sú v `playwright-report/` (necommitovať).

```bash
npm run build
npm run preview
```

`dist/` je statický produkčný artefakt s manifestom a service workerom. Nie je potrebná databáza ani serverové API kľúče. [Nasadenie a rollback](docs/DEPLOYMENT.md).

## Pripojenie zdrojov

- **GitHub:** Zdroje → Pripojiť GitHub → vložiť dočasný fine-grained PAT s Metadata: read-only → vybrať repozitáre → importovať.
- **Vercel:** Zdroje → Vercel token, prípadne Team ID. Import používa priamy browser prístup k API; oprávnenia a CORS závisia od služby.
- **Lokálne:** v druhom termináli `PROJECTS_DIR="$HOME/Projects" npm run server`. Skener počúva iba na `127.0.0.1:3001`. Zdroje → Lokálne projekty → Prehľadať. [Podrobný návod](docs/LOCAL-SCANNER.md).

Tokeny sú iba v pamäti. Importované metadáta a označenie Roadmap sú v lokálnom úložisku konkrétneho prehliadača. Toto je osobný nástroj bez zdieľania dát medzi používateľmi a bez prihlásenia; nikdy do verejného buildu nepridávaj súkromné importy alebo tajomstvá.

## Dokumentácia

- [Architektúra](docs/ARCHITECTURE.md)
- [Bezpečnosť a obmedzenia](docs/SECURITY.md)
- [Lokálny skener](docs/LOCAL-SCANNER.md)
- [Produkčné overenie](docs/PRODUCTION-READINESS.md)
- [Zmeny](docs/CHANGELOG.md)

Zdrojový import: `clean01-main.zip`, pôvodný commit archívu `0619988e4e20f103c96d3066d86b935a15818332`. Táto kópia smeruje do repozitára uvedeného vyššie. Licencia na ďalšie šírenie sa týmto neprideľuje.
