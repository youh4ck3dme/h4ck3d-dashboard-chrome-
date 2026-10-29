import type { ProjectCategory, ProjectStatus, ProjectVisibility, RiskLevel } from '../data/projects';

/**
 * Single source of every UI label (F1). Source data (project names, statuses in the
 * dataset) stays untouched — the maps below only translate what the UI shows.
 */
export const t = {
  appTitle: 'H4CK3D Project Timeline',
  tagline: 'Od prototypov po produkčné PWA, SaaS, AI, Firebase, WordPress a DevOps systémy.',
  skipToContent: 'Preskočiť na obsah',
  mainNavigation: 'Hlavná navigácia',
  splash: {
    loading: 'Načítavam H4CK3D Project Timeline',
    skip: 'Preskočiť úvodnú obrazovku',
    subtitle: 'Časová os projektov',
  },
  nav: {
    timeline: 'Časová os',
    sources: 'Zdroje',
  },
  search: {
    label: 'Hľadať projekt',
    placeholder: 'Hľadať projekt…',
    open: 'Hľadať',
    close: 'Zavrieť hľadanie',
  },
  sort: {
    label: 'Zoradiť',
    newest: 'Najnovšie',
    oldest: 'Najstaršie',
    button: (value: string) => `Zoradiť: ${value}`,
  },
  filters: {
    title: 'Filtre',
    all: 'Všetky filtre',
    close: 'Zavrieť filtre',
    clear: 'Zrušiť všetky filtre',
    clearCount: (count: number) => `Zrušiť všetky filtre (${count})`,
    quickFilters: 'Rýchle filtre',
    category: 'Kategória',
    status: 'Stav',
    visibility: 'Viditeľnosť',
    featuredOnly: 'Iba odporúčané',
  },
  stats: {
    total: 'Celkom',
    production: 'Produkcia',
    inProgress: 'Vo vývoji',
    featured: 'Odporúčané',
  },
  data: {
    sample:
      'Ukážkové údaje — pripoj zdroj pre svoje skutočné projekty. Stavy a popisy ukážok nie sú overené.',
    imported: 'Importované metadáta. Kategória, vyspelosť a riziko sú odhady, nie výsledok auditu projektu.',
  },
  timeline: {
    undated: 'Bez dátumu',
    featured: 'Odporúčané',
  },
  card: {
    open: 'Otvoriť',
    openLabel: (name: string) => `Otvoriť ${name}`,
  },
  inspector: {
    empty: 'Vyber projekt a zobrazí sa jeho príbeh.',
    label: (name: string) => `${name} – detail`,
  },
  detail: {
    close: 'Zavrieť detail',
    category: 'Kategória',
    status: 'Stav',
    visibility: 'Viditeľnosť',
    date: 'Dátum',
    maturity: 'Vyspelosť',
    maturityOf: (level: number) => `Vyspelosť: ${level}/5`,
    stack: 'Technológie',
    links: 'Prepojenia',
    notConnected: 'Nepripojené',
    business: 'Obchodný zámer',
    technical: 'Technický zámer',
    risk: 'Miera rizika',
    nextStep: 'Ďalší krok',
    openGitHub: 'Otvoriť GitHub',
    openVercel: 'Otvoriť Vercel',
    caseStudy: 'Prípadová štúdia',
    roadmap: 'Do plánu',
    onRoadmap: 'V pláne',
    linkedTo: (list: string) => `Prepojené: ${list}`,
  },
  empty: {
    title: 'Žiadne projekty nezodpovedajú filtrom',
    description: 'Skús upraviť hľadanie alebo zrušiť filtre.',
    action: 'Zrušiť všetky filtre',
  },
  results: {
    for: (query: string) => `pre „${query}“`,
  },
} as const;

export const categoryLabel: Record<ProjectCategory, string> = {
  PWA: 'PWA',
  SaaS: 'SaaS',
  AI: 'AI',
  Firebase: 'Firebase',
  WordPress: 'WordPress',
  DevOps: 'DevOps',
  Web: 'Web',
  Mobile: 'Mobil',
  'E-commerce': 'E-commerce',
};

export const statusLabel: Record<ProjectStatus, string> = {
  Prototype: 'Prototyp',
  'In Progress': 'Vo vývoji',
  Production: 'Produkcia',
  Archived: 'Archivované',
};

export const visibilityLabel: Record<ProjectVisibility, string> = {
  Public: 'Verejné',
  Private: 'Súkromné',
  Internal: 'Interné',
};

export const riskLabel: Record<RiskLevel, string> = {
  Low: 'Nízke',
  Medium: 'Stredné',
  High: 'Vysoké',
};

/** Slovak plural: 1 projekt, 2–4 projekty, 0/5+ projektov. */
export function projectCount(count: number): string {
  if (count === 1) return '1 projekt';
  if (count >= 2 && count <= 4) return `${count} projekty`;
  return `${count} projektov`;
}
