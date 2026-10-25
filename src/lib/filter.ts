import type { Project, ProjectCategory, ProjectStatus, ProjectVisibility } from '../data/projects';

export const CATEGORIES: readonly ProjectCategory[] = [
  'PWA',
  'SaaS',
  'AI',
  'Firebase',
  'WordPress',
  'DevOps',
  'Web',
  'Mobile',
  'E-commerce',
];
export const STATUSES: readonly ProjectStatus[] = ['Prototype', 'In Progress', 'Production', 'Archived'];
export const VISIBILITIES: readonly ProjectVisibility[] = ['Public', 'Private', 'Internal'];

export type SortOrder = 'newest' | 'oldest';

export interface FilterState {
  search: string;
  categories: string[];
  statuses: string[];
  visibilities: string[];
  featuredOnly: boolean;
  sort: SortOrder;
}

export const initialFilterState: FilterState = {
  search: '',
  categories: [],
  statuses: [],
  visibilities: [],
  featuredOnly: false,
  sort: 'newest',
};

export function toggleItem<T>(array: readonly T[], item: T): T[] {
  return array.includes(item) ? array.filter((i) => i !== item) : [...array, item];
}

/** Number of active facet filters (search and sort excluded). */
export function activeFilterCount(f: FilterState): number {
  return f.categories.length + f.statuses.length + f.visibilities.length + (f.featuredOnly ? 1 : 0);
}

export function hasActiveFilters(f: FilterState): boolean {
  return f.search.trim() !== '' || activeFilterCount(f) > 0;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matchesSearch(p: Project, query: string): boolean {
  const haystack = normalize([p.name, p.story, p.category, p.repoFullName ?? '', ...p.tech].join(' '));
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function time(p: Project): number {
  const t = new Date(p.date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function filterProjects(projects: Project[], filters: FilterState): Project[] {
  const query = filters.search.trim();
  const result = projects.filter((p) => {
    if (query && !matchesSearch(p, query)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
    if (filters.visibilities.length > 0 && !filters.visibilities.includes(p.visibility)) return false;
    if (filters.featuredOnly && !p.featured) return false;
    return true;
  });

  return result.sort((a, b) => (filters.sort === 'newest' ? time(b) - time(a) : time(a) - time(b)));
}

export interface TimelineGroup {
  key: string;
  year: string;
  month: string;
  projects: Project[];
}

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long' });

/** Groups already-sorted projects by year+month, preserving order. */
export function groupProjectsByYearMonth(projects: Project[]): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();

  for (const p of projects) {
    const d = new Date(p.date);
    const valid = !Number.isNaN(d.getTime());
    const year = valid ? String(d.getFullYear()) : 'Undated';
    const month = valid ? monthFormat.format(d) : '';
    const key = `${year}-${valid ? String(d.getMonth() + 1).padStart(2, '0') : '00'}`;

    let group = groups.get(key);
    if (!group) {
      group = { key, year, month, projects: [] };
      groups.set(key, group);
    }
    group.projects.push(p);
  }

  return Array.from(groups.values());
}
