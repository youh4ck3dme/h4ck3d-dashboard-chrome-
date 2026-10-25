import { type Dispatch, type SetStateAction, useId } from 'react';
import { CATEGORIES, type FilterState, STATUSES, VISIBILITIES, toggleItem } from '../lib/filter';
import { Chip } from './ui/Chip';
import { Toggle } from './ui/Toggle';

interface FilterControlsProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  headingLevel?: 'h3' | 'h4';
}

type ArrayKey = 'categories' | 'statuses' | 'visibilities';

const GROUPS: { key: ArrayKey; label: string; options: readonly string[] }[] = [
  { key: 'categories', label: 'Category', options: CATEGORIES },
  { key: 'statuses', label: 'Status', options: STATUSES },
  { key: 'visibilities', label: 'Visibility', options: VISIBILITIES },
];

/** Facet filters shared by the desktop sidebar and the mobile filter sheet. */
export function FilterControls({ filters, setFilters, headingLevel: H = 'h3' }: FilterControlsProps) {
  return (
    <>
      {GROUPS.map(({ key, label, options }) => (
        <div key={key} role="group" aria-label={label} className="flex flex-col gap-3">
          <H className="text-xs font-medium uppercase tracking-wide text-muted">{label}</H>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <Chip
                key={option}
                active={filters[key].includes(option)}
                onClick={() => setFilters((f) => ({ ...f, [key]: toggleItem(f[key], option) }))}
              >
                {option}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function FeaturedAndSort({
  filters,
  setFilters,
}: Pick<FilterControlsProps, 'filters' | 'setFilters'>) {
  const sortLabelId = useId();
  return (
    <>
      <Toggle
        label="Featured only"
        checked={filters.featuredOnly}
        onChange={(featuredOnly) => setFilters((f) => ({ ...f, featuredOnly }))}
      />
      <div className="flex items-center justify-between">
        <span id={sortLabelId} className="text-xs font-medium text-muted">
          Sort
        </span>
        <div
          role="group"
          aria-labelledby={sortLabelId}
          className="flex rounded-md border border-border bg-surface p-0.5"
        >
          {(['newest', 'oldest'] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              aria-pressed={filters.sort === sort}
              onClick={() => setFilters((f) => ({ ...f, sort }))}
              className={`rounded-sm px-3 py-1 text-xs capitalize transition-colors ${
                filters.sort === sort ? 'bg-surface-3 text-primary' : 'text-muted hover:text-primary'
              }`}
            >
              {sort}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
