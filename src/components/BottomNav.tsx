import { Cable, List, Star } from 'lucide-react';

export type MobileTab = 'timeline' | 'featured' | 'sources';

interface BottomNavProps {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  connectedCount: number;
}

const TABS: { id: MobileTab; label: string; icon: typeof List }[] = [
  { id: 'timeline', label: 'Timeline', icon: List },
  { id: 'featured', label: 'Featured', icon: Star },
  { id: 'sources', label: 'Zdroje', icon: Cable },
];

export function BottomNav({ active, onChange, connectedCount }: BottomNavProps) {
  return (
    <nav
      aria-label="Hlavná navigácia"
      className="pb-safe shrink-0 border-t border-border bg-surface lg:hidden"
    >
      <div className="grid h-16 grid-cols-3">
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
                  <span className="absolute right-3 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-app">
                    {connectedCount}
                  </span>
                )}
              </span>
              <span className={`text-[11px] font-medium ${isActive ? 'text-primary' : 'text-muted'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
