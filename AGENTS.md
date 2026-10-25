# Project rules

- Personal React/Vite PWA; keep API tokens in memory only and imported project data in browser storage.
- Never infer audited production readiness from repository size, age, hosting visibility, or maturity estimates.
- Run `npm run check` after changes. For UI, PWA or headers also build and run `npm run test:e2e` (install browsers first).
- Maintain strict CSP and exact-origin/Host protection on the loopback-only scanner.
- Preserve the lockfile; do not commit node_modules, dist, .env, browser reports, credentials, or private project exports.
- Preserve published Git history. Deployments are distinct from Git pushes; report only observed outcomes.
