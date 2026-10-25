# Nasadenie

Repozitár: `youh4ck3dme/h4ck3d-dashboard-timeline`. Projekt je statická PWA, výstup je `dist/`.

## Vercel

1. Importuj uvedený GitHub repozitár do svojho Vercel účtu/tímu.
2. Framework Vite, build `npm run build`, output `dist`, Node.js 22 alebo 24. Nevyžaduje environment secrets.
3. Pred produkciou over výsledky CI a preview. Konfigurácia `vercel.json` nastaví SPA routing a bezpečnostné hlavičky.

Push do GitHubu sám o sebe nepotvrdzuje žiadny deployment. Automatický produkčný deploy vznikne až po prepojení repozitára s hostingom.

## PWA a cache

- HTML, manifest a SW sa revalidujú. Hashované `/assets/*` sa ukladajú immutable.
- Aktualizácia aplikácie vyžaduje kliknutie na toast Aktualizovať.
- GitHub, Vercel a scanner requesty sa neukladajú do SW cache; importy pre offline použitie sú v localStorage.
- Fonty a základná aplikácia sú dostupné offline po aktivácii SW. Úvodný mobilný obrázok sa načíta a cacheuje pri prvom mobilnom otvorení.
- HTTPS je potrebné pre inštaláciu PWA (localhost je vývojová výnimka).

## Kontrola hostingu

Po nasadení over HTTP 200 pre `/`, `/manifest.webmanifest`, `/sw.js` a ikony; bezpečnostné hlavičky, hlboké SPA URL, offline reload a aktualizáciu SW. `vite preview` overuje CSP a aplikáciu, nie pravidlá Vercel CDN; tie treba skontrolovať na skutočnom hostingu.

## Rollback

Vo Vercel Deployments zvoľ predchádzajúci overený deployment a Promote to Production. Over HTML/SW hlavičky a dostupnosť. Nemaž lokálne importy používateľov.

## Lokálny skener z HTTPS stránky

`CORS_ORIGINS=https://tvoja-domena.example PROJECTS_DIR="$HOME/Projects" npm run server`

Origin musí presne zodpovedať doméne aplikácie. Browser môže žiadať súhlas s prístupom k lokálnej sieti. `localhost` na iPhone označuje iPhone, nie MacBook; skener na inom zariadení sa takto nedá používať. Skener nevystavuj na verejné rozhranie.

## Release smoke testy proti hostingu

```bash
BASE_URL=https://<skutocna-domena> TEST_WEBKIT=1 npm run test:release
```

Táto sada vyžaduje reálnu adresu a nespúšťa preview ani skener. Kontroluje hlavičky, routing, asset cache, manifest a offline browser reload. `BASE_URL=... npm run test:e2e` spustí pôvodné interakčné scenáre proti zvolenému hostingu (GitHub/Vercel stále mockované) a lokálny fixture skener s príslušným CORS originom.

Aktuálny blokér nasadenia a ďalšie kroky sú v [RELEASE-STATUS.md](RELEASE-STATUS.md).
