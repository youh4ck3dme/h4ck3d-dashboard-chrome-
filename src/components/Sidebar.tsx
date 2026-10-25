import type { Dispatch, SetStateAction } from 'react';
import { Search } from 'lucide-react';
import { type FilterState, activeFilterCount, initialFilterState } from '../lib/filter';
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
      aria-label="Filters"
      className="no-scrollbar hidden h-full w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r border-border bg-app p-5 lg:flex xl:w-72"
    >
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-placeholder" aria-hidden />
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search projects…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-white/30"
        />
      </div>

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
            Clear all filters ({activeCount})
          </Button>
        )}
      </div>
    </aside>
  );
}
