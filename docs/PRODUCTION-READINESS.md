# Overenie pripravenosti — 25. 10. 2026

Rozsah: osobný statický dashboard/PWA a voliteľný lokálny skener. Zdroj: používateľom dodaný `clean01-main.zip`, commit archívu `0619988e4e20f103c96d3066d86b935a15818332`, SHA-256 archívu `80dc36d47e10f140af47731a50ef424130bb40170aefd16260ca70819846eba9`.

## Overené lokálne

| Brána                       | Výsledok                | Dôkaz / rozsah                                                                              |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Reprodukovateľná inštalácia | PASS                    | `npm ci`, committed package-lock                                                            |
| Formát a lint               | PASS                    | Prettier, ESLint s nulou povolených varovaní                                                |
| TypeScript                  | PASS                    | Aplikácia, Vite/Playwright konfigurácie a browser testy                                     |
| Unit/component              | 58 PASS                 | Vitest, 6 súborov                                                                           |
| Scanner HTTP                | 8 PASS                  | Skutočný loopback server, metódy, Host/Origin/PNA, discovery, symlinky a sanitizácia remote |
| Browser                     | 16 PASS                 | 8 scenárov × desktop/mobile Chromium, produkčný build/CSP                                   |
| Automatická prístupnosť     | PASS v testovanom stave | Axe WCAG 2 A/AA a 2.1 AA pre hlavný dashboard, oba viewporty                                |
| Offline                     | PASS                    | Manifest, aktivácia SW a reload bez siete, oba viewporty                                    |
| Build                       | PASS                    | Vite 7.3.7, PWA plugin 2; manifest + SW + 24 precache položiek (~477 KiB)                   |
| Audit závislostí            | 0 nálezov               | `npm audit --audit-level=moderate`, všetky závislosti, platí k overeniu                     |
| Vizuálna kontrola           | PASS                    | 1440×960 a 390×844 bez nežiaduceho horizontálneho posunu                                    |

Lokálne prostredie: Node 24.22.1, npm 11.9.0, Chromium 153. Download štandardných Playwright browserov nebol v tomto prostredí dostupný; použitá bola lokálna kompatibilná Chromium binárka cez `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Bežný beh/CI používa browser verziu Playwrightu.

Browser scenáre: hľadanie/reset/detail/persistencia Roadmap; GitHub import/reload/odpojenie; API chyba a odstránenie tokenu; poškodené localStorage; CSP/manifest/SW/offline; keyboard Escape + axe; Vercel production URL mapovanie bez uloženého tokenu; **skutočný lokálny skener → HTTP → UI → reload**. GitHub/Vercel odpovede sú mocky, bez živých používateľských tokenov.

## Opravy oproti archívu

- Audit: 10 nálezov (2 critical, 2 high, 6 moderate) → 0 po aktualizácii Vite, Vitest, sharp, PWA pluginu a opravenej parser závislosti.
- Runtime validácia všetkých API/storage hraníc, chybové stavy, timeouty, zrušenie importu a odmietnutie neúplného stránkovania.
- Rozdielni vlastníci rovnakého názvu repozitára zostávajú oddelení; ukážkové údaje sú označené a po importe nahradené.
- GitHub vek/veľkosť už neoznačuje projekt ako produkčne pripravený; Vercel hosting neznamená verejnosť.
- Skener striktne loopback, Host/Origin ochrana, bez root ciest v health, bez credentials v remote URL; súbežné skeny sa zlúčia.
- Trvalé Roadmap označenie, kontrast drobných textov, zoom aj v standalone PWA.
- CI pre Node 22/24 a desktop/mobile Chromium + WebKit; dokumentácia a nové repo pravidlá.

## Čo tento výsledok nepotvrdzuje

- **Hosting/deployment:** nebol súčasťou požiadavky. Verejná produkčná URL a Vercel CDN hlavičky/routing sa musia overiť po nasadení.
- **Živé integrácie:** GitHub/Vercel účty, práva tokenov, limity a Vercel CORS treba overiť s reálnym účtom. Do repozitára tokeny nepridávať.
- **Safari/iOS:** lokálne nebol k dispozícii WebKit ani fyzický iPhone. CI má WebKit projekt; jeho výsledok je vo workflow, emulácia nenahrádza test inštalácie na zariadení.
- **Multi-user/SaaS:** nejde o autentifikovanú zdieľanú službu. Importy sú iba v danom browser profile a sú viditeľné tomu, kto má prístup k profilu.
- **Absolútna bezpečnosť:** nulový audit ani úspešné testy nie sú zárukou neprítomnosti ďalších chýb. Automatický axe audit nepokrýva všetky požiadavky prístupnosti.

Kód má overené lokálne brány pre uvedený rozsah. Aktuálny stav vzdialeného CI je vždy [GitHub Actions](https://github.com/youh4ck3dme/h4ck3d-dashboard-timeline/actions).
