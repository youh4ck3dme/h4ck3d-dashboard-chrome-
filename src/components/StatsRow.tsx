import type { Dispatch, SetStateAction } from 'react';
import type { Project, ProjectStatus } from '../data/projects';
import { type FilterState, hasActiveFilters, initialFilterState, toggleItem } from '../lib/filter';
import { t } from '../lib/i18n';

interface StatsRowProps {
  projects: Project[];
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

/**
 * F9: the numbers are controls. Clicking one applies the matching filter,
 * clicking it again removes it; "Celkom" resets everything.
 */
export function StatsRow({ projects, filters, setFilters }: StatsRowProps) {
  const statusOnly = (status: ProjectStatus) =>
    filters.statuses.length === 1 && filters.statuses[0] === status;

  const stats = [
    {
      key: 'total',
      label: t.stats.total,
      value: projects.length,
      active: !hasActiveFilters(filters),
      toggle: () => setFilters(initialFilterState),
    },
    {
      key: 'production',
      label: t.stats.production,
      value: projects.filter((p) => p.status === 'Production').length,
      active: statusOnly('Production'),
      toggle: () => setFilters((f) => ({ ...f, statuses: toggleItem(f.statuses, 'Production') })),
    },
    {
      key: 'inProgress',
      label: t.stats.inProgress,
      value: projects.filter((p) => p.status === 'In Progress').length,
      active: statusOnly('In Progress'),
      toggle: () => setFilters((f) => ({ ...f, statuses: toggleItem(f.statuses, 'In Progress') })),
    },
    {
      key: 'featured',
      label: t.stats.featured,
      value: projects.filter((p) => p.featured).length,
      active: filters.featuredOnly,
      toggle: () => setFilters((f) => ({ ...f, featuredOnly: !f.featuredOnly })),
    },
  ];

  return (
    <div role="group" aria-label={t.filters.quickFilters} className="mb-5 grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <button
          key={stat.key}
          type="button"
          aria-pressed={stat.active}
          aria-label={`${stat.label}: ${stat.value}`}
          onClick={stat.toggle}
          className={`flex min-h-[56px] min-w-0 flex-col justify-center rounded-md border px-1.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 lg:px-4 lg:py-3 ${
            stat.active ? 'border-primary bg-surface-2' : 'border-border bg-surface hover:bg-surface-2'
          }`}
        >
          <span className="text-lg font-medium leading-tight text-primary lg:text-2xl">{stat.value}</span>
          <span className="text-xs leading-tight text-muted">{stat.label}</span>
        </button>
      ))}
    </div>
  );
}
