import type { RiskLevel } from '../../data/projects';
import { riskLabel } from '../../lib/i18n';

export function RiskBar({ level }: { level: RiskLevel }) {
  const segments = level === 'Low' ? 1 : level === 'Medium' ? 2 : 3;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 w-4 rounded-sm ${i <= segments ? 'bg-primary' : 'bg-surface-3'}`} />
        ))}
      </div>
      <span className="text-xs text-muted">{riskLabel[level]}</span>
    </div>
  );
}
