# H4CK3D Project Timeline — dokumentácia

PWA dashboard, ktorý spája statické projekty, GitHub repozitáre, Vercel projekty a lokálne priečinky do jednej timeline.

| Dokument                             | Obsah                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| [FEATURES.md](FEATURES.md)           | Čo appka robí, obrazovky, správanie na mobile/desktope |
| [ARCHITECTURE.md](ARCHITECTURE.md)   | Štruktúra kódu, dátový tok, moduly, rozhodnutia        |
| [DEVELOPMENT.md](DEVELOPMENT.md)     | Lokálny vývoj, skripty, testy, štýl kódu               |
| [DEPLOYMENT.md](DEPLOYMENT.md)       | Vercel, CI, cache, rollback                            |
| [SECURITY.md](SECURITY.md)           | CSP, tokeny, ukladanie dát, lokálny skener             |
| [LOCAL-SCANNER.md](LOCAL-SCANNER.md) | Companion server pre lokálne projekty                  |
| [CHANGELOG.md](CHANGELOG.md)         | História zmien                                         |

## Rýchly prehľad

- **Stack:** React 18 · TypeScript 5.7 (strict) · Vite 7 · Tailwind 3 · vite-plugin-pwa (Workbox) · Vitest
- **Hosting:** Vercel (tím `h4ck3d`), statický build `dist/`
- **Repo:** `youh4ck3dme/h4ck3d-dashboard-timeline`
- **Kvalita:** `npm run check` = Prettier + ESLint (0 warnings) + tsc + 38 testov + build
