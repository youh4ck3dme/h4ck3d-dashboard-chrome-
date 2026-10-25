import type { Project } from '../data/projects';
import { ProjectCard } from './ProjectCard';

interface FeaturedProjectsProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  limit?: number;
}

export function FeaturedProjects({ projects, selectedId, onSelect, limit }: FeaturedProjectsProps) {
  const featured = projects.filter((p) => p.featured);
  const shown = limit ? featured.slice(0, limit) : featured;
  if (shown.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-primary">Featured</h2>
          <p className="text-sm text-muted">Key projects and milestones.</p>
        </div>
        <span className="shrink-0 text-xs text-placeholder">
          {shown.length} of {featured.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {shown.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isSelected={selectedId === p.id}
            onClick={() => onSelect(p.id)}
            isFeatured
          />
        ))}
      </div>
    </section>
  );
}
