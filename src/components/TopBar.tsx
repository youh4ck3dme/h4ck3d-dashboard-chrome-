import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Cable, Search, X } from 'lucide-react';
import { Button } from './ui/Button';
import { t } from '../lib/i18n';
import type { FilterState } from '../lib/filter';

interface TopBarProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  onSourcesClick: () => void;
  connectedCount: number;
  /** F5: on phones the search only exists where it filters something (timeline). */
  searchEnabled: boolean;
  /** F5: focusing search from another tab first switches to the timeline. */
  onSearchIntent: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const isDesktop = () => window.matchMedia?.('(min-width: 1024px)').matches ?? false;

/** F4: one search control per breakpoint — same label, same ⌘K / Ctrl+K and "/" shortcut. */
export function TopBar({
  filters,
  setFilters,
  onSourcesClick,
  connectedCount,
  searchEnabled,
  onSearchIntent,
}: TopBarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const setSearch = (search: string) => setFilters((f) => ({ ...f, search }));

  const activate = useCallback(() => {
    if (isDesktop()) {
      desktopInput.current?.focus();
      desktopInput.current?.select();
      return;
    }
    onSearchIntent();
    setMobileSearchOpen(true);
  }, [onSearchIntent]);

  // ⌘K / Ctrl+K or "/" focuses search from anywhere in the app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!combo && !(e.key === '/' && !typing)) return;
      e.preventDefault();
      activate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activate]);

  useEffect(() => {
    if (mobileSearchOpen) mobileInput.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!searchEnabled) setMobileSearchOpen(false);
  }, [searchEnabled]);

  return (
    <header className="pt-safe relative z-30 shrink-0 border-b border-border bg-app">
      <div className="relative flex h-12 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-sm font-medium tracking-tight text-primary">H4CK3D</span>
          <span className="hidden font-mono text-sm text-muted sm:block">/timeline</span>
        </div>

        <div className="relative mx-8 hidden max-w-md flex-1 items-center lg:flex">
          <Search className="absolute left-3 h-4 w-4 text-placeholder" aria-hidden />
          <input
            ref={desktopInput}
            type="search"
            aria-label={t.search.label}
            aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
            placeholder={t.search.placeholder}
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('');
                e.currentTarget.blur();
              }
            }}
            className="h-8 w-full rounded-md border border-border bg-surface pl-9 pr-14 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-white/30"
          />
          <kbd className="pointer-events-none absolute right-2 rounded border border-border px-1.5 font-mono text-xs text-placeholder">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>

        {mobileSearchOpen && (
          <div className="absolute inset-0 z-40 flex items-center gap-2 bg-app pl-4 pr-1 lg:hidden">
            <Search className="h-4 w-4 shrink-0 text-placeholder" aria-hidden />
            <input
              ref={mobileInput}
              type="search"
              aria-label={t.search.label}
              aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
              placeholder={t.search.placeholder}
              enterKeyHint="search"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('');
                  setMobileSearchOpen(false);
                }
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent text-base text-primary placeholder:text-placeholder focus:outline-none"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.search.close}
              onClick={() => setMobileSearchOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="-mr-2 flex items-center gap-1 lg:mr-0 lg:gap-2">
          {searchEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className="relative lg:hidden"
              aria-label={t.search.open}
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
              {filters.search && (
                <span
                  aria-hidden
                  className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary"
                />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => setFilters((f) => ({ ...f, sort: f.sort === 'newest' ? 'oldest' : 'newest' }))}
          >
            {t.sort.button(filters.sort === 'newest' ? t.sort.newest : t.sort.oldest)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 lg:inline-flex"
            onClick={onSourcesClick}
          >
            <Cable className="h-3.5 w-3.5" aria-hidden />
            {t.nav.sources}
            {connectedCount > 0 && (
              <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] text-app">
                {connectedCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
