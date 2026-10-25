# Architektúra

Statická React 18/TypeScript aplikácia; Vite 7 vyrába `dist/`, Workbox/PWA plugin 2 v režime injectManifest balí vlastný src/sw.ts a manifest. Backend ani databáza nie sú súčasťou webového nasadenia. Lokálny Node skener je samostatný, voliteľný proces na počítači používateľa.

## Hlavné vrstvy

| Vrstva      | Súbory                                                             | Zodpovednosť                                                          |
| ----------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Shell       | `src/index.tsx`, `App.tsx`, `components/`                          | Layout, filtre, modal, detail, ErrorBoundary, PWA aktualizácia        |
| API         | `lib/github.ts`, `lib/sources.ts`, `lib/request.ts`                | Fixed endpoints, stránkovanie, timeout, chyby a mapovanie             |
| Validácia   | `lib/validation.ts`, `lib/url.ts`                                  | Kontrola neznámych API/storage dát a bezpečných URL                   |
| Dáta        | `hooks/useProjectSources.ts`, `offline/db.ts`, `offline/store.ts`  | Browser-only importy, merge, IndexedDB a migrácia                     |
| Prezentácia | `lib/filter.ts`, `category.ts`, `date.ts`                          | Filtrovanie, odhady kategórií a časová os                             |
| Lifecycle   | `hooks/useSourceRequest.ts`, `useDialog.ts`, `useWelcomeScreen.ts` | Zrušenie požiadaviek, focus/Escape a mobilný splash                   |
| Skener      | `server/local-scanner.mjs`                                         | Loopback read-only HTTP, bezpečný Host/Origin a metadata z priečinkov |

## Dátový tok

Používateľ pripojí zdroj → API odpoveď prejde runtime validáciou → mapper vytvorí `Project` → import sa uloží lokálne → `mergeProjects` spáruje identity → filtre a skupiny podľa dátumu → timeline/detail.

GitHub identita je `owner/repo` (case-insensitive). Rovnaký názov medzi rôznymi repo identitami sa nezlúči. Názov je náhradný kľúč iba pri jednoznačnej kompatibilnej zhode. Vercel hosting neurčuje verejnosť projektu. Veľkosť a vek GitHub repozitára neurčujú produkčnú pripravenosť.

Pokiaľ nie je prítomný import, aplikácia zobrazuje označenú statickú ukážku z `data/projects.ts`. Skutočný import ju nahradí; ukážky neprepisujú údaje zo zdrojov.

## Persistencia a offline

- Importy: IndexedDB sourceSnapshots; pôvodné source localStorage kľúče sa migrujú.
- Roadmap: IndexedDB projectOverrides oddelené od importovaných metadát.
- Splash posledná aktivita: sessionStorage.
- Tokeny: iba v pamäti session refresh callbackov, odstránené pri odpojení alebo zavretí aplikácie; nikdy v úložisku.
- SW: shell/assety/fonty offline, API requesty bez runtime cache.

## Rozhodnutia

Self-hosted fonty a assets odstránia závislosť na externom font serveri. CSP sa zrkadlí z `vercel.json` do preview. Importy sa pri zrušení komponentu abortujú. Zoom zostáva dostupný aj v nainštalovanej PWA. CI má minimálne `contents: read` oprávnenie a overuje Node 22 aj 24, potom browser scenáre.

Podrobná schéma, fronta, lease/fencing, LWW a hranice background/cross-device synchronizácie: [OFFLINE-SYNC.md](OFFLINE-SYNC.md).
