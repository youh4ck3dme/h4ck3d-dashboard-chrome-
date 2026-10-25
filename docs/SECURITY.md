# Bezpečnosť

Táto aplikácia je osobná statická PWA. Nemá serverové konto, zdieľanú databázu ani prístup k cudziemu počítaču. Importované súkromné metadáta chráni lokálny profil prehliadača, nie prihlasovacia obrazovka aplikácie. Zdieľaný počítač/profil nie je vhodný pre citlivé importy.

## Webová aplikácia

- `vercel.json`: CSP bez inline skriptov a eval, self-hosted fonty, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Odchádzajúce pripojenia sú obmedzené na GitHub API, Vercel API a loopback skener.
- HSTS, nosniff, DENY, referrer policy, Permissions-Policy a COOP.
- Externé URL pripúšťajú iba HTTP/HTTPS bez prihlasovacích údajov. Odkazy majú `noopener noreferrer`.
- API odpovede aj uložené projekty prechádzajú runtime validáciou povinných polí, polí dátumov, kolekcií a odkazov. Poškodené legacy dáta sa nemigrujú ani automaticky nemažú; používateľ dostane upozornenie.
- Požiadavky majú 15-sekundový timeout na stránku, zrušenie pri odchode a `redirect: error`, `cache: no-store`. Neúplné stránkovanie sa hlási ako chyba, nie ako kompletný import.

## Tokeny a metadáta

PAT/Vercel token sa odosiela iba na pevný API endpoint danej služby. Po importe môže zostať v pamäťovom session callbacku pre automatický refresh. Pri odpojení alebo zavretí aplikácie sa zahodí. Nikdy sa nezapisuje do IndexedDB, outboxu, localStorage, cookies, repozitára ani logov. Zavretie modalu zruší rozpracovaný import; už pripojený session refresher zaniká odpojením zdroja.

IndexedDB `h4ck3d-timeline` obsahuje importované metadáta, lokálne Roadmap overrides a sync protokol. Zdrojové localStorage kľúče sa migrujú. Storage signal obsahuje iba náhodné ID, sessionStorage riadi splash. Zdroj sa odpojí zvýšením generácie a odstránením snapshotu/fronty; overrides sa zachovajú. [Offline schéma, export a reset](OFFLINE-SYNC.md).

Lokálna gzip záloha môže obsahovať súkromné názvy a cesty a nie je šifrovaná. Dáta sa nesynchronizujú medzi zariadeniami. XSS alebo rozšírenie s prístupom k stránke môže čítať pamäť aj úložisko; používaj minimálne oprávnenia a krátku platnosť tokenov.

## Lokálny skener

- Počúva výhradne na `127.0.0.1`. Verejný HOST odmietne už pri štarte.
- Host musí byť localhost/127.0.0.1 a zodpovedať skutočnému portu servera. Cudzí Host odmietne aj bez Origin (DNS rebinding).
- Presný CORS whitelist: dev originy a explicitné `CORS_ORIGINS`. Wildcard a `Origin: null` sa nepripúšťajú. CLI požiadavky bez Origin sú povolené pri platnom Host.
- Len GET/OPTIONS, `no-store`, žiadny zápis súborov. `/health` neobsahuje cesty.
- Preskakuje symlinky pri prechádzaní, závislosti a skryté adresáre. Hĺbka 1–6. Súbežné skeny sa zlúčia; výsledok má 3-sekundovú pamäťovú cache.
- Odstráni credentials/query/hash z HTTP(S)/SSH remote URL pred odoslaním. `git log` má timeout 3 sekundy a nepoužíva shell.
- CORS nie je autentifikácia pre lokálny škodlivý proces. Skener je určený pre vlastný počítač, nie ako verejná služba.

## Závislosti a CI

Lockfile je súčasťou repozitára. CI blokuje aj moderate nálezy cez `npm audit --audit-level=moderate`. Aktuálny výsledok auditu platí k času vykonania, nie navždy.

`postcss-selector-parser` je explicitne prebitý na opravenú vetvu `^7.1.6`, pretože Tailwind 3/PostCSS nested používali zraniteľné staršie vetvy. [Advisory a patch](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). Kompatibilitu overuje produkčný CSS build a prehliadačové testy. Vite, Vitest, PWA plugin a sharp sú aktualizované na opravené verzie.

Bezpečnostné chyby oznam súkromne vlastníkovi repozitára. Nevkladaj do verejných issues tokeny, súkromné názvy projektov ani lokálne cesty.
