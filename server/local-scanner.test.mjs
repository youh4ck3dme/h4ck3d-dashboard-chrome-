import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createScanner, scannerConfig } from './local-scanner.mjs';

let root, server, port;
const origin = 'https://timeline.example.com';
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'timeline-scanner-'));
  await mkdir(join(root, 'one', '.git'), { recursive: true });
  await writeFile(
    join(root, 'one', 'package.json'),
    JSON.stringify({ name: '@demo/one', dependencies: { react: '*' } }),
  );
  await writeFile(
    join(root, 'one', '.git', 'config'),
    '[remote "origin"]\n url = https://user:private-token@github.com/demo/one.git\n',
  );
  await mkdir(join(root, 'group', 'two'), { recursive: true });
  await writeFile(join(root, 'group', 'two', 'package.json'), '{"name":"two"}');
  await mkdir(join(root, 'node_modules', 'ignored'), { recursive: true });
  await writeFile(join(root, 'node_modules', 'ignored', 'package.json'), '{"name":"ignored"}');
  await symlink(join(root, 'one'), join(root, 'symlink'), 'dir');
  server = createScanner({ roots: [root], allowedOrigins: [origin] });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (root) await rm(root, { recursive: true, force: true });
});
function call(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let text = '';
      res.on('data', (chunk) => {
        text += chunk;
      });
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}
test('health does not expose configured directories', async () => {
  const response = await call('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(response.headers['cache-control'], 'no-store');
});
test('scan discovers projects, skips dependencies and symlinks, removes credentials', async () => {
  const response = await call('/api/local/projects', { headers: { Origin: origin } });
  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], origin);
  assert.deepEqual(response.body.projects.map((p) => p.name).sort(), ['one', 'two']);
  assert.equal(
    response.body.projects.find((p) => p.name === 'one').remoteUrl,
    'https://github.com/demo/one.git',
  );
  assert.ok(!JSON.stringify(response.body).includes('private-token'));
});
test('untrusted origins cannot scan', async () => {
  const response = await call('/api/local/projects', { headers: { Origin: 'https://evil.example' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});
test('DNS rebinding host rejected without an Origin header', async () => {
  assert.equal(
    (await call('/api/local/projects', { headers: { Host: `evil.example:${port}` } })).status,
    403,
  );
});
test('forged host port and absolute request targets rejected', async () => {
  assert.equal((await call('/health', { headers: { Host: 'localhost:1' } })).status, 403);
  assert.equal((await call('http://evil.example/health')).status, 400);
});
test('private network preflight only for trusted origins', async () => {
  const response = await call('/api/local/projects', { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-private-network'], 'true');
  assert.equal((await call('/health', { method: 'OPTIONS', headers: { Origin: 'null' } })).status, 403);
});
test('rejects writes and returns structured 404', async () => {
  assert.equal((await call('/api/local/projects', { method: 'POST' })).status, 405);
  assert.equal((await call('/missing')).status, 404);
});
test('refuses public binding, invalid roots/depth/port and wildcard origins', () => {
  for (const env of [
    { HOST: '0.0.0.0' },
    { PORT: '-1' },
    { PORT: 'NaN' },
    { SCAN_DEPTH: '100' },
    { PROJECTS_DIR: ' , ' },
    { CORS_ORIGINS: '*' },
  ]) {
    assert.throws(() => scannerConfig(env));
  }
  assert.equal(scannerConfig({}).host, '127.0.0.1');
});
