import type { Project } from '../data/projects';
import { inferCategoryFromText } from './category';
import { type GitHubRepo, inferCategory, inferMaturity, inferStatus, repoToLanguageTags } from './github';
import { displayHost, safeExternalUrl } from './url';
import { fetchWithTimeout } from './request';
import { isLocalProject, isVercelProject, record } from './validation';

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  createdAt: number;
  updatedAt: number;
  link?: { type?: string; org?: string; repo?: string };
  latestDeployments?: {
    url: string;
    readyState?: string;
    createdAt: number;
  }[];
  targets?: {
    production?: { url?: string; alias?: string[]; readyState?: string };
  };
}

export interface LocalProject {
  name: string;
  path: string;
  description?: string | null;
  remoteUrl?: string | null;
  lastCommitDate?: string | null;
  dependencies?: string[];
}

export interface SourceFetchResult<T> {
  status?: number;
  retryAfter?: string;
  items: T[];
  error: string | null;
}

const DEP_TAGS: Record<string, string> = {
  react: 'React',
  next: 'Next.js',
  vite: 'Vite',
  firebase: 'Firebase',
  'firebase-admin': 'Firebase',
  tailwindcss: 'Tailwind',
  '@angular/core': 'Angular',
  vue: 'Vue',
  svelte: 'Svelte',
  astro: 'Astro',
  express: 'Express',
  three: 'Three.js',
  'react-native': 'React Native',
  typescript: 'TypeScript',
  '@supabase/supabase-js': 'Supabase',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  openai: 'OpenAI',
};

export function normalizeRepoKey(input?: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  const plain = value.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (plain) return `${plain[1]}/${plain[2]}`.toLowerCase();
  const ssh = value.match(/^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]}`.toLowerCase();
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:', 'ssh:'].includes(url.protocol) ||
      url.hostname.toLowerCase() !== 'github.com' ||
      url.password
    )
      return null;
    const match = url.pathname.match(/^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
  } catch {
    return null;
  }
}

function depsToTags(deps: string[] = []): string[] {
  const tags = deps.map((d) => DEP_TAGS[d]).filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 5);
}

export function githubToProject(repo: GitHubRepo): Project {
  return {
    id: `gh-${repo.id}`,
    name: repo.name,
    story: repo.description || `GitHub repository — ${repo.language || 'no language detected'}.`,
    category: inferCategory(repo),
    status: inferStatus(repo),
    visibility: repo.private ? 'Private' : 'Public',
    tech: repoToLanguageTags(repo),
    date: repo.pushed_at || repo.created_at,
    maturity: inferMaturity(repo),
    featured: false,
    businessPurpose: safeExternalUrl(repo.homepage)
      ? `Live at ${displayHost(safeExternalUrl(repo.homepage)!)}`
      : 'GitHub project.',
    technicalPurpose: `${repo.language || 'Multi-language'} repository with ${repo.size} KB of code.`,
    risk: repo.private && !repo.archived ? 'Medium' : 'Low',
    nextStep: repo.archived ? 'Archived.' : 'Review latest commits.',
    githubUrl: safeExternalUrl(repo.html_url),
    repoFullName: repo.full_name.toLowerCase(),
    sources: ['GitHub'],
  };
}

export function vercelToProject(p: VercelProject): Project {
  const latest = p.latestDeployments?.[0];
  const production = p.targets?.production;
  const host = production?.alias?.[0] ?? production?.url ?? latest?.url;
  const state = production?.readyState ?? latest?.readyState;
  const repoKey = p.link?.org && p.link?.repo ? `${p.link.org}/${p.link.repo}`.toLowerCase() : undefined;

  return {
    id: `vc-${p.id}`,
    name: p.name,
    story: `Vercel project${p.framework ? ` built with ${p.framework}` : ''}.`,
    category: inferCategoryFromText(`${p.name} ${p.framework ?? ''}`),
    status: production?.readyState === 'READY' ? 'Production' : 'In Progress',
    visibility: 'Internal', // Hosting does not establish access/visibility settings.
    tech: p.framework ? [p.framework] : [],
    date: new Date(p.updatedAt).toISOString(),
    maturity: host ? 4 : 2,
    featured: false,
    businessPurpose: host ? `Deployed at ${host}` : 'Vercel project without production deployment.',
    technicalPurpose: `Hosted on Vercel${p.framework ? ` (${p.framework})` : ''}.`,
    risk: state === 'ERROR' ? 'High' : 'Low',
    nextStep: state === 'ERROR' ? 'Fix the failing deployment.' : 'Monitor production deployment.',
    vercelUrl: host ? safeExternalUrl(`https://${displayHost(host)}`) : undefined,
    vercelState: state,
    repoFullName: repoKey,
    githubUrl: repoKey ? `https://github.com/${repoKey}` : undefined,
    sources: ['Vercel'],
  };
}

export function localToProject(l: LocalProject): Project {
  const repoKey = normalizeRepoKey(l.remoteUrl) ?? undefined;
  const date = l.lastCommitDate ?? new Date().toISOString();
  const tech = depsToTags(l.dependencies);

  return {
    id: `lc-${l.path}`,
    name: l.name,
    story: l.description || 'Local project on this machine.',
    category: inferCategoryFromText(`${l.name} ${l.description ?? ''} ${tech.join(' ')}`),
    status: repoKey ? 'In Progress' : 'Prototype',
    visibility: 'Internal',
    tech,
    date,
    maturity: repoKey ? 3 : 1,
    featured: false,
    businessPurpose: 'Local working copy.',
    technicalPurpose: tech.length ? `Uses ${tech.join(', ')}.` : 'No known dependencies detected.',
    risk: repoKey ? 'Low' : 'Medium',
    nextStep: repoKey ? 'Push pending changes.' : 'Create a GitHub repository for this project.',
    localPath: l.path,
    repoFullName: repoKey,
    githubUrl: repoKey ? `https://github.com/${repoKey}` : undefined,
    sources: ['Local'],
  };
}

function mergeTwo(a: Project, b: Project): Project {
  return {
    ...a,
    identityAliases: Array.from(
      new Set([...(a.identityAliases ?? []), ...(b.identityAliases ?? []), `id:${a.id}`, `id:${b.id}`]),
    ),
    sources: Array.from(new Set([...(a.sources ?? []), ...(b.sources ?? [])])),
    tech: Array.from(new Set([...a.tech, ...b.tech])).slice(0, 6),
    githubUrl: a.githubUrl ?? b.githubUrl,
    caseStudyUrl: a.caseStudyUrl ?? b.caseStudyUrl,
    repoFullName: a.repoFullName ?? b.repoFullName,
    vercelUrl: a.vercelUrl ?? b.vercelUrl,
    vercelState: a.vercelState ?? b.vercelState,
    localPath: a.localPath ?? b.localPath,
  };
}

/** Merges projects from all sources, matching by GitHub repo first, then by name. */
export function mergeProjects(lists: Project[][]): Project[] {
  const result: Project[] = [];
  // A bare name is not an identity: different GitHub owners can use the same name.
  const repoIndex = new Map<string, number>();
  const nameIndex = new Map<string, number[]>();
  for (const list of lists) {
    for (const p of list) {
      const repo = p.repoFullName?.toLowerCase();
      const name = p.name.toLowerCase();
      const candidates = nameIndex.get(name) ?? [];
      const compatible = candidates.filter(
        (i) => !repo || !result[i].repoFullName || result[i].repoFullName?.toLowerCase() === repo,
      );
      const hit =
        (repo ? repoIndex.get(repo) : undefined) ?? (compatible.length === 1 ? compatible[0] : undefined);
      const i = hit ?? result.length;
      if (hit === undefined) result.push({ ...p, sources: [...(p.sources ?? [])] });
      else result[i] = mergeTwo(result[i], p);
      if (!candidates.includes(i)) nameIndex.set(name, [...candidates, i]);
      const mergedRepo = result[i].repoFullName?.toLowerCase();
      if (mergedRepo) repoIndex.set(mergedRepo, i);
    }
  }
  return result;
}

export async function fetchVercelProjects(
  token: string,
  teamId?: string,
  signal?: AbortSignal,
): Promise<SourceFetchResult<VercelProject>> {
  const items: VercelProject[] = [];
  let until: number | null = null;

  try {
    for (let page = 0; page < 20; page++) {
      const params = new URLSearchParams({ limit: '100' });
      if (teamId) params.set('teamId', teamId);
      if (until) params.set('until', String(until));

      const res = await fetchWithTimeout(`https://api.vercel.com/v9/projects?${params}`, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        return {
          items: [],
          error: 'Neplatný Vercel token alebo chýbajú oprávnenia k tímu.',
          status: res.status,
        };
      }
      if (!res.ok) {
        return {
          items: [],
          error: `Vercel API chyba: ${res.status} ${res.statusText}`,
          status: res.status,
          retryAfter: res.headers.get('retry-after') ?? undefined,
        };
      }

      const data: unknown = await res.json();
      if (
        !record(data) ||
        !Array.isArray(data.projects) ||
        !data.projects.every(isVercelProject) ||
        (data.pagination != null &&
          (!record(data.pagination) ||
            (data.pagination.next != null &&
              (typeof data.pagination.next !== 'number' || !Number.isFinite(data.pagination.next)))))
      ) {
        return { items: [], error: 'Vercel API vrátilo neplatné dáta.', status: 422 };
      }
      items.push(...data.projects);
      const next = (data.pagination as { next?: number | null } | undefined)?.next ?? null;
      if (next === null) break;
      if (page === 19 || (until !== null && next >= until)) {
        return { items: [], error: 'Vercel import prekročil limit strán alebo sa stránkovanie opakuje.' };
      }
      until = next;
    }
    return { items, error: null };
  } catch {
    return {
      items: [],
      error:
        'Nepodarilo sa spojiť s Vercel API. Ak prehliadač požiadavku blokuje, načítaj Vercel projekty cez lokálny server.',
    };
  }
}

export async function fetchLocalProjects(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<SourceFetchResult<LocalProject>> {
  const base = safeExternalUrl(baseUrl);
  if (!base) return { items: [], error: 'Neplatná adresa servera.' };
  const url = `${base.replace(/\/$/, '')}/api/local/projects`;
  try {
    const res = await fetchWithTimeout(url, { signal });
    if (!res.ok) {
      return { items: [], error: `Lokálny server vrátil chybu ${res.status}.` };
    }
    const data: unknown = await res.json();
    const list = Array.isArray(data) ? data : (data as { projects?: unknown })?.projects;
    if (!Array.isArray(list)) return { items: [], error: 'Lokálny server vrátil neplatné dáta.' };
    if (!list.every(isLocalProject)) return { items: [], error: 'Lokálny server vrátil neplatné projekty.' };
    const items = list;
    return { items, error: null };
  } catch {
    return {
      items: [],
      error: `Lokálny server na ${baseUrl} neodpovedá. Spusti ho príkazom „npm run server“.`,
    };
  }
}
