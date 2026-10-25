import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllRepos } from './github';
import {
  fetchLocalProjects,
  fetchVercelProjects,
  githubToProject,
  mergeProjects,
  normalizeRepoKey,
} from './sources';
import { isProjectList } from './validation';
import { projects } from '../data/projects';
import { readJSON } from './storage';
import { safeExternalUrl } from './url';

const repo = {
  id: 1,
  name: 'demo',
  full_name: 'alice/demo',
  html_url: 'https://github.com/alice/demo',
  description: null,
  language: null,
  homepage: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-02',
  pushed_at: '2026-01-02',
  stargazers_count: 0,
  forks_count: 0,
  private: true,
  archived: false,
  fork: false,
  default_branch: 'main',
  size: 800,
};
const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers });
afterEach(() => vi.unstubAllGlobals());

describe('GitHub API boundary', () => {
  it('reads all pages and sends credentials only to fixed API endpoint', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json([repo], 200, { link: '<anything>; rel="next"', 'x-ratelimit-remaining': '9' }),
      )
      .mockResolvedValueOnce(json([{ ...repo, id: 2 }]));
    vi.stubGlobal('fetch', fetch);
    const result = await fetchAllRepos('fake-token');
    expect(result.repos).toHaveLength(2);
    expect(result.rateLimitRemaining).toBe(9);
    expect(fetch.mock.calls.every(([url]) => new URL(url).origin === 'https://api.github.com')).toBe(true);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      redirect: 'error',
      cache: 'no-store',
      headers: { Authorization: 'Bearer fake-token' },
    });
  });
  it.each([401, 403, 429, 500])('handles HTTP %s without importing partial data', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status, { 'x-ratelimit-remaining': '0' })));
    const result = await fetchAllRepos('fake');
    expect(result.error).toBeTruthy();
    expect(result.repos).toEqual([]);
  });
  it.each([{}, [{ ...repo, name: 123 }], [{ ...repo, topics: [3] }], [{ ...repo, pushed_at: 'invalid' }]])(
    'rejects malformed response %#',
    async (data) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)));
      expect((await fetchAllRepos('fake')).error).toContain('neplatné');
    },
  );
  it('accepts a repository that has never been pushed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ ...repo, pushed_at: null }])));
    expect((await fetchAllRepos('fake')).repos).toHaveLength(1);
  });
  it('never silently truncates paginated results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => json([repo], 200, { link: '<x>; rel="next"' })),
    );
    expect((await fetchAllRepos('fake')).error).toContain('3 000');
  });
  it('handles cancelled and unavailable networks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    expect((await fetchAllRepos('fake')).error).toContain('zrušené');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await fetchAllRepos('fake')).error).toContain('offline');
  });
});

describe('Vercel and local API boundaries', () => {
  it('paginates using next cursor and validates deployments', async () => {
    const project = { id: '1', name: 'demo', framework: 'vite', createdAt: 1, updatedAt: 1 };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ projects: [project], pagination: { next: 123 } }))
      .mockResolvedValueOnce(json({ projects: [{ ...project, id: '2' }], pagination: { next: null } }));
    vi.stubGlobal('fetch', fetch);
    expect((await fetchVercelProjects('fake', 'team-test')).items).toHaveLength(2);
    expect(fetch.mock.calls[1][0]).toContain('until=123');
    expect(fetch.mock.calls[1][0]).toContain('teamId=team-test');
  });
  it('rejects malformed Vercel dates and deployment shapes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(json({ projects: [{ id: '1', name: 'bad', createdAt: 1, updatedAt: 'bad' }] })),
    );
    expect((await fetchVercelProjects('fake')).error).toContain('neplatné');
  });
  it('detects stuck Vercel cursors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => json({ projects: [], pagination: { next: 123 } })),
    );
    expect((await fetchVercelProjects('fake')).error).toContain('stránkovanie');
  });
  it('validates optional local fields before mapping', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ projects: [{ name: 'bad', path: '/tmp', dependencies: 'react' }] })),
    );
    expect((await fetchLocalProjects('http://localhost:3001')).error).toContain('neplatné');
  });
  it('imports a valid local response and rejects unsafe server URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(json({ projects: [{ name: 'good', path: '/tmp', dependencies: ['react'] }] })),
    );
    expect((await fetchLocalProjects('http://localhost:3001')).items).toHaveLength(1);
    expect((await fetchLocalProjects('javascript:alert(1)')).error).toBeTruthy();
  });
});

describe('persisted data and repository identity', () => {
  it('recovers from truncated/corrupt storage without crashing', () => {
    localStorage.setItem('h4ck3d:items', '{');
    expect(readJSON('items', [], isProjectList)).toEqual([]);
    localStorage.setItem('h4ck3d:items', JSON.stringify([{ id: 'x', name: 'missing required fields' }]));
    expect(readJSON('items', [], isProjectList)).toEqual([]);
    expect(isProjectList(projects)).toBe(true);
    expect(isProjectList([{ ...projects[0], githubUrl: 'javascript:alert(1)' }])).toBe(false);
    expect(isProjectList([{ ...projects[0], tech: [null] }])).toBe(false);
  });
  it('does not merge repos with identical names but different owners', () => {
    const a = githubToProject(repo);
    const b = githubToProject({ ...repo, id: 2, full_name: 'bob/demo' });
    expect(mergeProjects([[a], [b]])).toHaveLength(2);
  });
  it('rejects fake github hosts and credential-bearing external URLs', () => {
    expect(normalizeRepoKey('https://evilgithub.com/alice/demo')).toBeNull();
    expect(normalizeRepoKey('https://github.com.evil.example/alice/demo')).toBeNull();
    expect(safeExternalUrl('https://secret:token@example.com')).toBeUndefined();
  });
});
