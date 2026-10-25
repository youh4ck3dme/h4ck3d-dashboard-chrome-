# Lokálny skener

Node server bez runtime závislostí. Hľadá podpriečinky s `package.json` alebo `.git`.

```bash
PROJECTS_DIR="$HOME/Projects" npm run server
PROJECTS_DIR="$HOME/code,$HOME/clients" SCAN_DEPTH=3 npm run server
CORS_ORIGINS=https://tvoja-domena.example PROJECTS_DIR="$HOME/Projects" npm run server
```

| Premenná       | Predvolené                       | Pravidlo                                    |
| -------------- | -------------------------------- | ------------------------------------------- |
| `PROJECTS_DIR` | `~/Projects` alebo prvý argument | Neprázdny zoznam koreňov, oddelený čiarkou  |
| `PORT`         | `3001`                           | Celé číslo 1–65535                          |
| `HOST`         | `127.0.0.1`                      | Inú hodnotu server odmietne                 |
| `SCAN_DEPTH`   | `2`                              | Celé číslo 1–6                              |
| `CORS_ORIGINS` | dev porty 5173/4173              | Ďalšie presné HTTP(S) originy, bez wildcard |

Skener neprehľadáva samotný koreň ako projekt, ale jeho deti. Preskakuje symlinky, skryté adresáre, node_modules, build výstupy a vendor. Projekty sa ďalej vnútornými podpriečinkami neprehľadávajú. Git worktrees sa rozpoznajú ako projekt, no `.git` súbor nemusí poskytnúť remote URL; párovanie vtedy vyžaduje zhodný jednoznačný názov.

- `GET /health` → `{ "ok": true }`.
- `GET /api/local/projects` → `{ "projects": [...] }`, vrátane názvu, cesty, popisu, bezpečnej remote URL, posledného dátumu commitu (alebo mtime priečinka) a názvov závislostí.
- Ostatné cesty 404, zápisové metódy 405, cudzí Host/Origin 403.

Výsledok sa drží 3 sekundy v pamäti. Tokeny vložené do Git remote URL sa neposielajú. `.env`, zdrojový kód ani obsah dokumentov sa nenačítavajú.

Pri 403 over presnú doménu v `CORS_ORIGINS`; pri nedostupnosti over port a bežiaci proces. Browser môže vyžadovať povolenie lokálnej siete. Na iPhone `localhost` neoznačuje MacBook. Skener nepúšťaj cez verejnú reverznú proxy; je navrhnutý pre ten istý počítač a prehliadač.
