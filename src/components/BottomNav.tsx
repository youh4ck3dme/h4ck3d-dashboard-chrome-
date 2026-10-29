import { Cable, List } from 'lucide-react';
import { t } from '../lib/i18n';

/** F2: no separate "Featured" tab — featured projects are marked in the timeline. */
export type MobileTab = 'timeline' | 'sources';

interface BottomNavProps {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  connectedCount: number;
}

const TABS: { id: MobileTab; label: string; icon: typeof List }[] = [
  { id: 'timeline', label: t.nav.timeline, icon: List },
  { id: 'sources', label: t.nav.sources, icon: Cable },
];

export function BottomNav({ active, onChange, connectedCount }: BottomNavProps) {
  return (
    <nav
      aria-label={t.mainNavigation}
      className="pb-safe shrink-0 border-t border-border bg-surface lg:hidden"
    >
      <div className="grid h-16 grid-cols-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex select-none flex-col items-center justify-center gap-1 focus-visible:bg-surface-2 focus-visible:outline-none"
            >
              <span
                className={`relative flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-surface-3' : 'active:bg-surface-2'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted'}`} />
                {id === 'sources' && connectedCount > 0 && (
                  <span className="absolute right-3 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-medium text-app">
                    {connectedCount}
                  </span>
                )}
              </span>
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
