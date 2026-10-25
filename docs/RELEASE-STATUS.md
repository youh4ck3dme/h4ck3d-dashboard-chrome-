# Release stav — 25. 10. 2026

## Git: PASS

Remote `https://github.com/youh4ck3dme/h4ck3d-dashboard-timeline.git`, vetva main sleduje origin/main. Východiskový commit `4dcbf503d584332114e0f12cb996f8804b605041` má zelené CI pre Node 22/24 a 24 browser scenárov vrátane WebKitu. Zápis cez pripojený GitHub účet je overený; CLI nemá uložené prihlasovanie na push. Tokeny sa nekopírujú do Git konfigurácie.

## Vercel: BLOCKED — kapacita tímu

Tím `h4ck3d` (`team_TDBfz8ZkzAmnjqyiWEGVIeO1`) je dostupný. Vyhľadanie projektu podľa presného repo URL vrátilo prázdny zoznam a projekt `h4ck3d-dashboard-timeline` neexistoval (404).

Vytvorenie projektu bolo službou odmietnuté: HTTP 400, `too_many_projects`, tím dosiahol 200 projektov na Hobby pláne. Projekt sa nevytvoril, deployment sa nespustil, produkčná URL nie je pridelená. Existujúce projekty ani plán sa nemenili.

Pokračovanie vyžaduje voľné miesto v tíme alebo používateľom výslovne určený existujúci projekt na použitie pre tento repozitár.

## Pripravené overenie nasadenia

`BASE_URL=https://<skutocna-domena> TEST_WEBKIT=1 npm run test:release`

Release testy samy nespúšťajú lokálny server. Overia verejný HTML dokument, bezpečnostné hlavičky, hlbokú SPA cestu, 404 pre neexistujúce assety, manifest/ikony/SW/MIME, cache a offline browser reload. Ak narazia na prihlásenie alebo ochranu deploymentu, nejde o úspešné overenie aplikácie. Použi oprávnený prístup podľa pravidiel hostingu, bez ukladania credentials do reportov.

Pôvodné browser scenáre možno spustiť aj cez `BASE_URL=... npm run test:e2e`; pre lokálny skener sa nastaví CORS origin podľa tejto URL. GitHub/Vercel scenáre v tejto sade stále používajú mocky.

## Nevykonané kontroly

- Preview/produkčné URL a Vercel CDN správanie: BLOCKED kapacitou.
- Živý GitHub/Vercel browser import: BLOCKED chýbajúcimi výslovne poskytnutými testovacími credentials; konektor nie je PAT pre aplikáciu.
- Lokálny skener z reálnej HTTPS domény: BLOCKED chýbajúcou doménou nasadenia.
- Fyzický iPhone a inštalácia: BLOCKED bez zariadenia.
- Rollback skúška na preview: BLOCKED bez deploymentu.

## Pokračovanie a rollback

Po uvoľnení miesta vytvor projekt v uvedenom tíme, pripoj presné repo, framework Vite, install npm ci, build npm run build, output dist a Node 22/24. Najprv over preview vrátane release testov. Produkčný build priprav bez priradenia domén, over ho a potom promovuj. Aktualizáciu SW a návrat na predchádzajúci overený build nacvič na preview; nepoškodzuj produkciu kvôli skúške. Prvý release zatiaľ nemá predchádzajúci overený produkčný deployment.
