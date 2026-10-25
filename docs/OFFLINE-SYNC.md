# Offline dáta a synchronizácia

## Rozsah a stav

| Funkcia                        | Stav             | Hranica                                                              |
| ------------------------------ | ---------------- | -------------------------------------------------------------------- |
| Importy a Roadmap na zariadení | IMPLEMENTOVANÉ   | IndexedDB v konkrétnom profile/origine prehliadača                   |
| Súbeh kariet                   | IMPLEMENTOVANÉ   | Transakcie, logický čítač, BroadcastChannel + storage/focus fallback |
| Foreground obnova zdrojov      | PODMIENENÉ       | Sieť, skener alebo session credentials v pamäti                      |
| Background lokálny refresh     | PODMIENENÉ       | Dostupný loopback skener, povolenie browsera a Background Sync API   |
| Cross-device sync              | NEIMPLEMENTOVANÉ | Existuje typ RemoteSyncAdapter, nie autentifikovaný backend          |
| CRDT a kolaborácia             | NEIMPLEMENTOVANÉ | Súčasný dátový model ich nevyžaduje                                  |
| Push/systémové notifikácie     | NEIMPLEMENTOVANÉ | Žiadne automatické žiadosti o oprávnenie ani push server             |

## IndexedDB v1

Databáza `h4ck3d-timeline` má štyri object stores:

- `sourceSnapshots`: kľúč source; projekty, fetchedAt, expiresAt, generation a schemaVersion. Index expiresAt. Endpoint sa ukladá iba pre loopback skener, nikdy pre tokeny.
- `projectOverrides`: kľúč identity; Roadmap a revízia {clock, actor, operationId}. Index revision.clock.
- `outbox`: kľúč id; kind, source/identity, generation, status, attempts, nextAttemptAt, leaseUntil, leaseOwner, fence. Indexy status, nextAttemptAt a source.
- `syncMeta`: kľúč key; globálny logický čítač, generácie zdrojov, lease/retry/requested metadáta. Žiadne credentials.

TTL importov je 24 hodín. Expirovaný snapshot sa označí ako zastaraný, nevymaže sa. Používateľské overrides a outbox nemajú TTL. `ready` a stav zapisovania sú oddelené od potvrdeného uloženia; neúspešná optimistic zmena sa vráti a zobrazí chybu aj nad mobilným detailom.

Identity uprednostňujú owner/repo, potom lokálnu cestu a ID. Pri merge sa prenášajú aliasy pôvodných ID. Rovnaký názov rôznych repozitárov nie je totožnosť. Statická ukážka sa nepovažuje za potvrdený import.

## Migrácia

Čítajú sa presné staré kľúče `h4ck3d:v1:source:GitHub`, `h4ck3d:v1:source:Vercel`, `h4ck3d:v1:source:Local` a `h4ck3d:roadmap:*`. Validné dáta sa ukladajú transakčne, novšie IDB záznamy sa neprepisujú. Staré hodnoty sa odstránia až po dokončení transakcie a porovnaní, že sa medzičasom nezmenili. Poškodené legacy záznamy zostávajú na mieste s upozornením. Prerušenie pred cleanup je obnoviteľné opakovaním migrácie.

Pri upozornení na staršiu kartu ju zatvor a znovu otvor aplikáciu. IndexedDB spojenie sa pri versionchange zavrie; nová schéma nesmie zmazať outbox. Nedostupné úložisko alebo kvóta sú viditeľnou chybou, nie tichým in-memory uložením.

## Konflikty a zápisy

Lokálne IndexedDB readwrite transakcie serializujú čítač revízií. Poradie LWW je clock, actor, operationId; wall-clock neurčuje víťaza používateľských zmien. Každý projekt sa zapisuje samostatne, takže rôzne projekty sa neprepisujú. Roadmap a prípadná remote-set operácia sa uložia v jednej transakcii; quota chyba abortuje oboje.

Toto poradie rieši karty jedného browser profilu, nie hodiny či identitu medzi zariadeniami. Remote-set fronta sa používa len pri explicitnej budúcej integrácii, štandardné Roadmap zmeny sú lokálne a nepotrebujú vzdialené potvrdenie. Bez adaptéra sa remote operácia nepotvrdí ani nezahodí.

## Obnova, lease a retry

Štart, online, focus, viditeľnosť a 30-sekundový foreground interval spúšťajú koordinátor. Čerstvé importy sa zbytočne neobnovujú. Manuálna obnova je dostupná v timeline; požiadavka na offline obnovu sa zachová. `navigator.onLine` je iba signál; úspech musí potvrdiť validovaná odpoveď.

Lokálny refresh má trvalú deduplikovanú outbox operáciu. Claim je atomický; 60-sekundový lease, owner a fence bránia neskorému procesoru v commite. Po páde možno lease prevziať. Odpojenie zvýši generáciu a zmaže snapshot i source queue, takže stará odpoveď nemôže import obnoviť.

Exponential backoff má jitter, rešpektuje Retry-After a po piatich lokálnych pokusoch vyžaduje manuálny retry. 401/403 zastavia automatické auth retry, 429/5xx a timeouty sú prechodné. Foreground auth refresh má lease, maximálne tri pokusy a 50-sekundový deadline; dlhé Retry-After sa odloží. Chyby formátu sú trvalé. Pri oboch mechanizmoch sa zachová posledný použiteľný snapshot.

GitHub refresh zachová vybrané repository IDs. GitHub/Vercel token ostáva iba v closure v pamäti počas otvorenej aplikácie; pri odpojení sa odstráni. Nové otvorenie vyžaduje opätovné pripojenie. Žiadny token sa neukladá do IDB, localStorage, outboxu alebo cache. Read-only zdroje neprijímajú Roadmap mutácie.

## Service worker

PWA používa injectManifest a vlastný `src/sw.ts`. Zachované sú precache shell/fonty/ikony, splash/font cache, offline navigácia a prompt aktualizácie cez SKIP_WAITING. API nemajú cache route.

Worker aj aplikácia používajú rovnaký outbox a fencing. Tag `h4ck3d-local-refresh` vykonáva iba skutočnú HTTP požiadavku na explicitne pripojený loopback skener. Native Sync API nie je dostupné vo všetkých browseroch; fallback pracuje počas otvorenej aplikácie. Browser môže ukončiť worker, zablokovať lokálnu sieť alebo nikdy doručiť sync udalosť. Čakajúce úlohy preto zostávajú v IDB. Zlyhanie prechodnej background úlohy odmietne udalosť a umožní retry podľa politiky browsera a nextAttemptAt.

Browser test message `RUN_LOCAL_QUEUE` preukazuje prácu reálneho service workera, nie prirodzené doručenie Background Sync po zatvorení browsera. Test bez API preukazuje foreground fallback. Fyzický iPhone ani OS scheduling sa tým nenahrádzajú.

## Prenosy a záloha

Koordinácia a leases odstránia duplicitné súbežné volania. Verejné API requesty sa svojvoľne nekomprimujú; bez overeného ETag kontraktu sa nepredstiera podpora podmieneného stránkovania.

Tlačidlo Exportovať lokálnu zálohu vytvorí vlastný JSON envelope {schemaVersion:1,data:{snapshots,overrides}}, gzip pri dostupnom CompressionStream alebo nekomprimovaný JSON fallback. Výstup môže obsahovať súkromné názvy a lokálne cesty; ide o vedomý lokálny download, nie cloud upload. Automatický restore/import zálohy zatiaľ nie je implementovaný. Meranie 100 reprezentatívnych záznamov: 7 731 B JSON → 397 B gzip (94,9 % menší súbor). Ide o exportné bajty, nie úsporu prenosov GitHub/Vercel API.

## Vymazanie dát

Odpojenie konkrétneho zdroja vymaže jeho import, nie Roadmap používateľa. Úplný reset je zámerná deštruktívna operácia: najprv exportuj zálohu, zavri ostatné karty, v DevTools Application/Storage vymaž `h4ck3d-timeline` a legacy h4ck3d kľúče. Pri čistom resete PWA možno odstrániť aj service worker a Cache Storage. Profil iného zariadenia sa tým nemení. Dáta nie sú šifrované proti používateľovi toho istého browser profilu ani XSS.

## Budúci remote adaptér

RemoteSyncAdapter vyžaduje userId, push s idempotency key a revíziou, pull s kurzorom, konflikty a revízne tombstones. Implementácia servera musí doplniť autentifikáciu, serverové vynútenie izolácie, validáciu operácií, autoritatívne poradie/reconciliation, idempotentný ledger a pravidlá potvrdenia odstránení. Testovací adaptér alebo lokálny outbox nie je cross-device produkt. Nová služba ani účet sa v tejto zmene nevytvárajú.
