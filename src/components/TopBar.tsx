import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { Cable, Search, X } from 'lucide-react';
import { Button } from './ui/Button';
import type { FilterState } from '../lib/filter';

interface TopBarProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  onSourcesClick: () => void;
  connectedCount: number;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function TopBar({ filters, setFilters, onSourcesClick, connectedCount }: TopBarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopInput = useRef<HTMLInputElement>(null);
  const setSearch = (search: string) => setFilters((f) => ({ ...f, search }));

  // ⌘K / Ctrl+K or "/" jumps to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!combo && !(e.key === '/' && !typing)) return;
      e.preventDefault();
      if (window.matchMedia('(min-width: 1024px)').matches) {
        desktopInput.current?.focus();
        desktopInput.current?.select();
      } else {
        setMobileSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
            aria-label="Jump to project"
            aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
            placeholder="Jump to project…"
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
          <kbd className="pointer-events-none absolute right-2 rounded border border-border px-1.5 font-mono text-[10px] text-placeholder">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>

        {mobileSearchOpen && (
          <div className="absolute inset-0 z-40 flex items-center gap-2 bg-app pl-4 pr-1 lg:hidden">
            <Search className="h-4 w-4 shrink-0 text-placeholder" aria-hidden />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects…"
              enterKeyHint="search"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMobileSearchOpen(false);
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-placeholder focus:outline-none"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close search"
              onClick={() => setMobileSearchOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="-mr-2 flex items-center gap-1 lg:mr-0 lg:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Search"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
            {filters.search && (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => setFilters((f) => ({ ...f, sort: f.sort === 'newest' ? 'oldest' : 'newest' }))}
          >
            Sort: {filters.sort === 'newest' ? 'Newest' : 'Oldest'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 lg:inline-flex"
            onClick={onSourcesClick}
          >
            <Cable className="h-3.5 w-3.5" aria-hidden />
            Zdroje
            {connectedCount > 0 && (
              <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-app">
                {connectedCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
