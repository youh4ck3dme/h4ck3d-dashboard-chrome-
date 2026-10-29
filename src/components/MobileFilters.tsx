import { type Dispatch, type SetStateAction, useId, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  CATEGORIES,
  type FilterState,
  activeFilterCount,
  initialFilterState,
  toggleItem,
} from '../lib/filter';
import { categoryLabel, t } from '../lib/i18n';
import { Chip } from './ui/Chip';
import { Button } from './ui/Button';
import { FeaturedAndSort, FilterControls } from './FilterControls';

interface MobileFiltersProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

export function MobileFilters({ filters, setFilters }: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const activeCount = activeFilterCount(filters);

  return (
    <div className="shrink-0 border-b border-border bg-app lg:hidden">
      <div className="scroll-x no-scrollbar flex items-center gap-2 px-4 py-1.5">
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((v) => !v)}
        >
          <SlidersHorizontal className="mr-2 h-3.5 w-3.5" aria-hidden />
          {activeCount > 0 ? `${t.filters.title} (${activeCount})` : t.filters.title}
        </Button>

        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={filters.categories.includes(category)}
            onClick={() => setFilters((f) => ({ ...f, categories: toggleItem(f.categories, category) }))}
          >
            {categoryLabel[category]}
          </Chip>
        ))}
      </div>

      {isOpen && (
        <div
          id={panelId}
          className="no-scrollbar flex max-h-[60vh] flex-col gap-6 overflow-y-auto border-t border-border bg-surface-2 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-primary">{t.filters.all}</h3>
            <Button variant="ghost" size="icon" aria-label={t.filters.close} onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <FilterControls filters={filters} setFilters={setFilters} headingLevel="h4" />

          <div className="flex flex-col gap-4 border-t border-border pt-2">
            <FeaturedAndSort filters={filters} setFilters={setFilters} />
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-muted"
                onClick={() => {
                  setFilters((f) => ({ ...initialFilterState, search: f.search, sort: f.sort }));
                  setIsOpen(false);
                }}
              >
                {t.filters.clear}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
