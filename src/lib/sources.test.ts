import { describe, expect, it } from 'vitest';
import type { GitHubRepo } from './github';
import { inferCategory, inferMaturity, inferStatus } from './github';
import { inferCategoryFromText } from './category';
import { githubToProject, localToProject, mergeProjects, normalizeRepoKey, vercelToProject } from './sources';
import { safeExternalUrl } from './url';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const repo = (o: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: 1,
  name: 'papi-hair-design-app',
  full_name: 'H4ck3d/papi-hair-design-app',
  description: 'Booking app',
  html_url: 'https://github.com/H4ck3d/papi-hair-design-app',
  language: 'TypeScript',
  stargazers_count: 0,
  forks_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-12-20T00:00:00Z',
  pushed_at: '2025-12-20T00:00:00Z',
  private: false,
  archived: false,
  fork: false,
  topics: [],
  default_branch: 'main',
  size: 800,
  homepage: null,
  ...o,
});

describe('normalizeRepoKey', () => {
  it.each([
    ['https://github.com/Foo/Bar.git', 'foo/bar'],
    ['git@github.com:Foo/Bar.git', 'foo/bar'],
    ['https://github.com/foo/bar/', 'foo/bar'],
    ['foo/bar', 'foo/bar'],
    ['https://gitlab.com/foo/bar', null],
    ['', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeRepoKey(input)).toBe(expected);
  });
});

describe('category inference', () => {
  it('uses word boundaries (no false AI hit on "email"/"detail")', () => {
    expect(inferCategoryFromText('email detail maintain')).toBe('Web');
    expect(inferCategoryFromText('AI chatbot')).toBe('AI');
    expect(inferCategoryFromText('studios portfolio')).toBe('Web');
    expect(inferCategoryFromText('ios app')).toBe('Mobile');
  });

  it('infers from repo name segments', () => {
    expect(inferCategory(repo({ name: 'my-pwa-shell', description: null }))).toBe('PWA');
  });
});

describe('github status / maturity', () => {
  it('archived wins', () => expect(inferStatus(repo({ archived: true }), NOW)).toBe('Archived'));
  it('recent push → In Progress', () => expect(inferStatus(repo(), NOW)).toBe('In Progress'));
  it('small stale repo → Prototype', () =>
    expect(inferStatus(repo({ size: 50, pushed_at: '2024-01-01T00:00:00Z' }), NOW)).toBe('Prototype'));
  it('maturity is capped at 5', () => expect(inferMaturity(repo(), NOW)).toBe(5));
});

describe('mapping + merging', () => {
  it('merges GitHub, Vercel and Local by repo key', () => {
    const gh = githubToProject(repo());
    const vc = vercelToProject({
      id: 'v1',
      name: 'papi-booking',
      framework: 'vite',
      createdAt: NOW,
      updatedAt: NOW,
      link: { type: 'github', org: 'H4ck3d', repo: 'papi-hair-design-app' },
      targets: { production: { alias: ['booking.papihairdesign.sk'], readyState: 'READY' } },
    });
    const lc = localToProject({
      name: 'papi',
      path: '/code/papi',
      remoteUrl: 'git@github.com:h4ck3d/papi-hair-design-app.git',
      dependencies: ['react', 'vite', 'unknown-lib'],
    });

    const merged = mergeProjects([[gh], [vc], [lc]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toEqual(['GitHub', 'Vercel', 'Local']);
    expect(merged[0].vercelUrl).toBe('https://booking.papihairdesign.sk/');
    expect(merged[0].localPath).toBe('/code/papi');
  });

  it('merges by name when no repo is linked', () => {
    const a = localToProject({ name: 'Same', path: '/a' });
    const b = vercelToProject({ id: 'x', name: 'same', framework: null, createdAt: NOW, updatedAt: NOW });
    expect(mergeProjects([[a], [b]])).toHaveLength(1);
  });
});

describe('safeExternalUrl', () => {
  it('accepts http(s) and bare hosts', () => {
    expect(safeExternalUrl('https://x.dev/a')).toBe('https://x.dev/a');
    expect(safeExternalUrl('x.vercel.app')).toBe('https://x.vercel.app/');
  });
  it('rejects dangerous schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('data:text/html,hi')).toBeUndefined();
    expect(safeExternalUrl('')).toBeUndefined();
  });
});
