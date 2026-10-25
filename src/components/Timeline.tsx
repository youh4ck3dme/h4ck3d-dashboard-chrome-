import type { Project } from '../data/projects';
import { groupProjectsByYearMonth } from '../lib/filter';
import { ProjectCard } from './ProjectCard';

interface TimelineProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Timeline({ projects, selectedId, onSelect }: TimelineProps) {
  const groups = groupProjectsByYearMonth(projects);
  let currentYear = '';

  return (
    <div className="relative">
      <div className="absolute bottom-0 left-[15px] top-0 hidden w-px bg-border md:block" aria-hidden />

      <div className="flex flex-col gap-10">
        {groups.map((group) => {
          const showYear = group.year !== currentYear;
          if (showYear) currentYear = group.year;

          return (
            <section key={group.key} className="relative">
              {showYear && (
                <div className="sticky top-0 z-10 mb-4 border-b border-border bg-app py-3 md:pl-12">
                  <h2 className="text-2xl font-medium text-primary">{group.year}</h2>
                </div>
              )}

              <div className="relative md:pl-12">
                <div
                  className="absolute left-[11px] top-1.5 hidden h-2 w-2 rounded-full border border-border bg-surface-3 md:block"
                  aria-hidden
                />

                <h3 className="mb-3 text-sm font-medium text-muted">
                  <span className="md:hidden">· </span>
                  {group.month} {group.year}
                </h3>

                <div className="flex flex-col gap-2">
                  {group.projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      isSelected={selectedId === p.id}
                      onClick={() => onSelect(p.id)}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
