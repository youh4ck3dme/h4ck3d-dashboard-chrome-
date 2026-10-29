import { t } from '../../lib/i18n';

export function MaturityBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" title={t.detail.maturityOf(level)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-2 w-1.5 rounded-sm ${i <= level ? 'bg-primary' : 'bg-surface-3'}`} />
      ))}
    </div>
  );
}
