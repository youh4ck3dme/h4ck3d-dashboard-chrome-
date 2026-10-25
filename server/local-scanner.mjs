#!/usr/bin/env node
/**
 * H4CK3D local project scanner — zero-dependency companion server for the
 * "Lokálne projekty" source.
 *
 *   npm run server                          # scans ~/Projects (or the cwd parent)
 *   PROJECTS_DIR=~/code npm run server
 *   CORS_ORIGINS=https://timeline.example.com npm run server
 *
 * Security: binds to 127.0.0.1 only, read-only, and answers CORS only for the
 * origins listed in CORS_ORIGINS (dev ports are always allowed) so a random
 * website can't read your folder structure.
 */
import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const expandHome = (p) => (p.startsWith('~') ? join(homedir(), p.slice(1)) : p);

export function scannerConfig(env = process.env, directory = process.argv[2]) {
  const host = env.HOST ?? '127.0.0.1';
  if (host !== '127.0.0.1') throw new Error('HOST must be 127.0.0.1; the scanner is local-only.');
  const port = Number(env.PORT ?? 3001);
  const maxDepth = Number(env.SCAN_DEPTH ?? 2);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 6)
    throw new Error('SCAN_DEPTH must be 1..6.');
  const roots = (env.PROJECTS_DIR ?? directory ?? join(homedir(), 'Projects'))
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => resolve(expandHome(p)));
  if (!roots.length) throw new Error('PROJECTS_DIR must contain at least one directory.');
  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const u = new URL(s);
      if (
        !['http:', 'https:'].includes(u.protocol) ||
        u.username ||
        u.password ||
        u.pathname !== '/' ||
        u.search ||
        u.hash
      )
        throw new Error('CORS_ORIGINS must contain exact http(s) origins.');
      return u.origin;
    });
  return { host, port, maxDepth, roots, allowedOrigins: [...DEV_ORIGINS, ...origins] };
}

const SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'vendor',
  '.turbo',
  'coverage',
]);

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readJSON(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

async function gitRemote(dir) {
  try {
    const config = await readFile(join(dir, '.git', 'config'), 'utf8');
    const origin = config.match(/\[remote "origin"\][^[]*?url\s*=\s*(.+)/);
    if (!origin) return null;
    const remote = origin[1].trim();
    if (/^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(remote)) return remote;
    try {
      const url = new URL(remote);
      if (!['https:', 'http:', 'ssh:'].includes(url.protocol)) return null;
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function lastCommit(dir) {
  try {
    const { stdout } = await run(
      'git',
      ['-C', dir, '-c', 'log.showSignature=false', 'log', '-1', '--format=%cI'],
      { timeout: 3000 },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function describe(dir) {
  const [pkg, hasGit] = await Promise.all([readJSON(join(dir, 'package.json')), exists(join(dir, '.git'))]);
  if (!pkg && !hasGit) return null;

  const [remoteUrl, commitDate, info] = await Promise.all([
    hasGit ? gitRemote(dir) : null,
    hasGit ? lastCommit(dir) : null,
    stat(dir),
  ]);

  return {
    name: (typeof pkg?.name === 'string' && pkg.name.replace(/^@[^/]+\//, '')) || basename(dir),
    path: dir,
    description: typeof pkg?.description === 'string' ? pkg.description : null,
    remoteUrl,
    lastCommitDate: commitDate ?? info.mtime.toISOString(),
    dependencies: Object.keys({ ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }),
  };
}

async function scan(dir, depth, out, maxDepth) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const project = await describe(full);
    if (project) out.push(project);
    else if (depth < maxDepth) await scan(full, depth + 1, out, maxDepth);
  }
}

export function createScanner({ roots, maxDepth = 2, allowedOrigins = DEV_ORIGINS }) {
  const allowed = new Set(allowedOrigins);
  let pendingScan;
  let cached;
  let expires = 0;
  function send(res, status, body, origin) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    };
    if (origin && allowed.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Allow-Private-Network'] = 'true';
    }
    res.writeHead(status, headers);
    res.end(body === null ? undefined : JSON.stringify(body));
  }
  async function projects() {
    if (cached && Date.now() < expires) return cached;
    if (!pendingScan)
      pendingScan = (async () => {
        const out = [];
        for (const root of roots) await scan(root, 1, out, maxDepth);
        out.sort((a, b) => (b.lastCommitDate ?? '').localeCompare(a.lastCommitDate ?? ''));
        cached = out;
        expires = Date.now() + 3000;
        return out;
      })().finally(() => {
        pendingScan = undefined;
      });
    return pendingScan;
  }
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    try {
      // Host validation is independent of CORS: blocks DNS rebinding and forged authority.
      const authority = new URL(`http://${req.headers.host ?? ''}`);
      const port = String(res.socket.localPort);
      if (
        !['localhost', '127.0.0.1'].includes(authority.hostname) ||
        authority.username ||
        authority.password ||
        authority.pathname !== '/' ||
        authority.search ||
        authority.hash ||
        (authority.port || '80') !== port
      )
        return send(res, 403, { error: 'Host is not allowed' }, null);
      if (origin && !allowed.has(origin)) return send(res, 403, { error: 'Origin is not allowed' }, null);
      const url = new URL(req.url ?? '/', authority);
      if (url.origin !== authority.origin) return send(res, 400, { error: 'Invalid request target' }, null);
      if (req.method === 'OPTIONS') return send(res, 204, null, origin);
      if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, origin);
      if (url.pathname === '/health') return send(res, 200, { ok: true }, origin);
      if (url.pathname === '/api/local/projects')
        return send(res, 200, { projects: await projects() }, origin);
      return send(res, 404, { error: 'Not found' }, origin);
    } catch {
      return send(res, 400, { error: 'Request failed' }, null);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = scannerConfig();
  const server = createScanner(config);
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(config.port, config.host, () => {
    console.log(`▲ H4CK3D local scanner on http://${config.host}:${config.port}`);
    console.log(`  scanning: ${config.roots.join(', ')} (depth ${config.maxDepth})`);
    for (const root of config.roots)
      exists(root).then((ok) => ok || console.warn(`Missing directory (parent: ${dirname(root)})`));
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
