import { type Dispatch, type SetStateAction, useId } from 'react';
import { CATEGORIES, type FilterState, STATUSES, VISIBILITIES, toggleItem } from '../lib/filter';
import { categoryLabel, statusLabel, t, visibilityLabel } from '../lib/i18n';
import { Chip } from './ui/Chip';
import { Toggle } from './ui/Toggle';

interface FilterControlsProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  headingLevel?: 'h3' | 'h4';
}

type ArrayKey = 'categories' | 'statuses' | 'visibilities';

const GROUPS: {
  key: ArrayKey;
  label: string;
  options: readonly string[];
  labelOf: (option: string) => string;
}[] = [
  {
    key: 'categories',
    label: t.filters.category,
    options: CATEGORIES,
    labelOf: (option) => categoryLabel[option as keyof typeof categoryLabel],
  },
  {
    key: 'statuses',
    label: t.filters.status,
    options: STATUSES,
    labelOf: (option) => statusLabel[option as keyof typeof statusLabel],
  },
  {
    key: 'visibilities',
    label: t.filters.visibility,
    options: VISIBILITIES,
    labelOf: (option) => visibilityLabel[option as keyof typeof visibilityLabel],
  },
];

/** Facet filters shared by the desktop sidebar and the mobile filter sheet. */
export function FilterControls({ filters, setFilters, headingLevel: H = 'h3' }: FilterControlsProps) {
  return (
    <>
      {GROUPS.map(({ key, label, options, labelOf }) => (
        <div key={key} role="group" aria-label={label} className="flex flex-col gap-2">
          <H className="text-xs font-medium uppercase tracking-wide text-muted">{label}</H>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <Chip
                key={option}
                active={filters[key].includes(option)}
                onClick={() => setFilters((f) => ({ ...f, [key]: toggleItem(f[key], option) }))}
              >
                {labelOf(option)}
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
  const sortLabels = { newest: t.sort.newest, oldest: t.sort.oldest } as const;
  return (
    <>
      <Toggle
        label={t.filters.featuredOnly}
        checked={filters.featuredOnly}
        onChange={(featuredOnly) => setFilters((f) => ({ ...f, featuredOnly }))}
      />
      <div className="flex min-h-[44px] items-center justify-between lg:min-h-0">
        <span id={sortLabelId} className="text-xs font-medium text-muted">
          {t.sort.label}
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
              className={`min-h-[44px] rounded-sm px-3 text-xs transition-colors lg:h-[30px] lg:min-h-0 ${
                filters.sort === sort ? 'bg-surface-3 text-primary' : 'text-muted hover:text-primary'
              }`}
            >
              {sortLabels[sort]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
