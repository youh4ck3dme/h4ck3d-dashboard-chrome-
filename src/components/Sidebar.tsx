import type { Dispatch, SetStateAction } from 'react';
import { type FilterState, activeFilterCount, initialFilterState } from '../lib/filter';
import { t } from '../lib/i18n';
import { Button } from './ui/Button';
import { FeaturedAndSort, FilterControls } from './FilterControls';

interface SidebarProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

export function Sidebar({ filters, setFilters }: SidebarProps) {
  const activeCount = activeFilterCount(filters);

  return (
    <aside
      aria-label={t.filters.title}
      className="no-scrollbar hidden h-full w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r border-border bg-app p-5 lg:flex xl:w-72"
    >
      <FilterControls filters={filters} setFilters={setFilters} />

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <FeaturedAndSort filters={filters} setFilters={setFilters} />
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 self-start text-muted"
            onClick={() => setFilters((f) => ({ ...initialFilterState, search: f.search, sort: f.sort }))}
          >
            {t.filters.clearCount(activeCount)}
          </Button>
        )}
      </div>
    </aside>
  );
}
