import type { ProjectStatus } from '../data/projects';
import { inferCategoryFromText } from './category';
import { fetchWithTimeout } from './request';
import { isGitHubRepo } from './validation';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  topics?: string[];
  default_branch: string;
  size: number;
  homepage: string | null;
}

export interface GitHubFetchResult {
  repos: GitHubRepo[];
  error: string | null;
  rateLimitRemaining: number | null;
}

const DAY = 24 * 60 * 60 * 1000;
const MAX_PAGES = 30; // 3 000 repos safety cap

function parseRateLimit(res: Response): number | null {
  const raw = res.headers.get('x-ratelimit-remaining');
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchAllRepos(token: string, signal?: AbortSignal): Promise<GitHubFetchResult> {
  const allRepos: GitHubRepo[] = [];
  let rateLimitRemaining: number | null = null;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await fetchWithTimeout(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
        {
          signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      rateLimitRemaining = parseRateLimit(response) ?? rateLimitRemaining;

      if (!response.ok) {
        if (response.status === 401) {
          return {
            repos: [],
            error: 'Neplatný token. Skontroluj, či je token správny a má scope "repo".',
            rateLimitRemaining,
          };
        }
        if (response.status === 403 || response.status === 429) {
          return {
            repos: [],
            error:
              rateLimitRemaining === 0
                ? 'Dosiahol si GitHub rate limit. Skús to znova o niekoľko minút.'
                : 'Prístup zamietnutý. Token nemá potrebné oprávnenia.',
            rateLimitRemaining,
          };
        }
        return {
          repos: [],
          error: `GitHub API chyba: ${response.status} ${response.statusText}`,
          rateLimitRemaining,
        };
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isGitHubRepo)) {
        return { repos: [], error: 'GitHub API vrátilo neplatné dáta.', rateLimitRemaining };
      }
      if (data.length === 0) break;
      allRepos.push(...data);

      const linkHeader = response.headers.get('link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) break;
      if (page === MAX_PAGES)
        return {
          repos: [],
          error: 'Import prekročil limit 3 000 repozitárov. Zúž prístup tokenu.',
          rateLimitRemaining,
        };
    }

    return { repos: allRepos, error: null, rateLimitRemaining };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { repos: [], error: 'Načítanie bolo zrušené.', rateLimitRemaining };
    }
    return {
      repos: [],
      error: `Chyba pripojenia: ${err instanceof Error ? err.message : 'Neznáma chyba'}`,
      rateLimitRemaining,
    };
  }
}

export function repoToLanguageTags(repo: GitHubRepo): string[] {
  const tags: string[] = [];
  if (repo.language) tags.push(repo.language);
  if (repo.topics) tags.push(...repo.topics.slice(0, 4));
  return Array.from(new Set(tags));
}

export function inferCategory(repo: GitHubRepo) {
  return inferCategoryFromText(
    [repo.name.replace(/[-_]/g, ' '), repo.description ?? '', ...(repo.topics ?? [])].join(' '),
  );
}

function daysSince(iso: string | null, now: number): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Infinity : (now - t) / DAY;
}

export function inferStatus(repo: GitHubRepo, now = Date.now()): ProjectStatus {
  if (repo.archived) return 'Archived';
  const days = daysSince(repo.pushed_at, now);
  if (days < 30) return 'In Progress';
  if (repo.size < 100) return 'Prototype';
  return 'In Progress'; // Recency and size cannot establish production readiness.
}

export function inferMaturity(repo: GitHubRepo, now = Date.now()): number {
  let score = 1;
  if (repo.size > 100) score++;
  if (repo.size > 500) score++;
  if (repo.description) score++;
  if (!repo.archived && daysSince(repo.pushed_at, now) < 180) score++;
  return Math.min(score, 5);
}
