import { ChevronRight, Github, HardDrive, Triangle } from 'lucide-react';
import type { Project, ProjectSource } from '../data/projects';
import { formatDate } from '../lib/date';
import { Badge } from './ui/Badge';
import { MaturityBar } from './ui/MaturityBar';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  isFeatured?: boolean;
}

const SOURCE_ICONS: Partial<Record<ProjectSource, typeof Github>> = {
  GitHub: Github,
  Vercel: Triangle,
  Local: HardDrive,
};

export function ProjectCard({ project, isSelected, onClick, isFeatured }: ProjectCardProps) {
  const dateStr = formatDate(project.date, 'short');
  const linked = (project.sources ?? []).filter((s) => SOURCE_ICONS[s]);

  const surface = isSelected
    ? 'bg-surface-2 border-transparent ring-1 ring-white/30'
    : isFeatured
      ? 'bg-surface border-border hover:bg-surface-2'
      : 'border-transparent hover:bg-surface-2';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Open ${project.name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group flex w-full min-w-0 cursor-pointer select-none flex-col gap-3 rounded-lg border p-4 transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 active:scale-[0.99] active:bg-surface-3 ${surface}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-primary">{project.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted lg:line-clamp-1">{project.story}</p>
        </div>
        <time dateTime={project.date} className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-muted">
          {dateStr}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{project.category}</Badge>
        <Badge variant="status" statusType={project.status === 'Production' ? 'filled' : 'outline'}>
          {project.status}
        </Badge>
        <Badge>{project.visibility}</Badge>
        {project.tech.length > 0 && <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />}
        {project.tech.slice(0, 2).map((t) => (
          <span key={t} className="text-[11px] text-muted">
            {t}
          </span>
        ))}
        {project.tech.length > 2 && (
          <span className="text-[11px] text-muted">+{project.tech.length - 2}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          <MaturityBar level={project.maturity} />
          {linked.length > 0 && (
            <div className="flex items-center gap-1.5" aria-label={`Linked: ${linked.join(', ')}`}>
              {linked.map((s) => {
                const Icon = SOURCE_ICONS[s]!;
                return <Icon key={s} className="h-3.5 w-3.5 text-placeholder" aria-hidden />;
              })}
            </div>
          )}
        </div>
        <span
          aria-hidden
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors group-hover:text-primary lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100"
        >
          Open
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
