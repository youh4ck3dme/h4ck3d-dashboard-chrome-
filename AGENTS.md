# Project rules

- Personal React/Vite PWA; keep API tokens in memory only and imported project data in browser storage.
- Never infer audited production readiness from repository size, age, hosting visibility, or maturity estimates.
- Run `npm run check` after changes. For UI, PWA or headers also build and run `npm run test:e2e` (install browsers first).
- Maintain strict CSP and exact-origin/Host protection on the loopback-only scanner.
- Preserve the lockfile; do not commit node_modules, dist, .env, browser reports, credentials, or private project exports.
- Preserve published Git history. Deployments are distinct from Git pushes; report only observed outcomes.

## Running in the Base44 sandbox

- `docker compose -f docker-compose.base44.yml up -d` starts a single `web` service: `node:22` running `npm ci` then `npm run dev -- --host 0.0.0.0 --port 3000`, with the repo bind-mounted at `/app` and `node_modules` in a named volume. Preview: host port 3000.
- There is no database, no server-side API and no environment file, so the app boots with no credentials. GitHub/Vercel tokens are typed into the Sources dialog and kept in memory; they never belong in env vars or files. Without connected sources the dashboard renders explicitly labelled sample data (44 demo projects).
- `server/local-scanner.mjs` (optional `npm run server`, loopback-only `127.0.0.1:3001`) is intentionally not part of the compose setup: it scans a host directory and cannot be reached from the sandbox browser.
- Vite's dev server only needs the platform-supplied `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` pass-through in compose; `vite.config.ts` is unchanged. Do not add CSP or `allowedHosts` rewrites for the sandbox — `vercel.json` headers apply to `vite preview`/production only.
- Verify inside the container: `docker compose -f docker-compose.base44.yml exec -T web sh -c 'npm run test:unit'` (or `test:scanner`, `typecheck`, `lint`). `npm run check` also runs `npm audit`, which reaches the network.
