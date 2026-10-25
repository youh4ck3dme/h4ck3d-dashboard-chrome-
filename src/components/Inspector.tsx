import { MousePointerClick } from 'lucide-react';
import type { Project } from '../data/projects';
import { ProjectDetail } from './ProjectDetail';

interface InspectorProps {
  project: Project | null;
  onClose: () => void;
}

export function Inspector({ project, onClose }: InspectorProps) {
  if (!project) {
    return (
      <aside className="hidden h-full w-80 shrink-0 flex-col items-center justify-center border-l border-border bg-app p-8 text-center lg:flex xl:w-96">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
          <MousePointerClick className="h-5 w-5 text-muted" />
        </div>
        <p className="text-sm text-muted">Select a project to see its story.</p>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`${project.name} detail`}
      className="scroll-y no-scrollbar hidden h-full w-80 shrink-0 border-l border-border bg-app p-6 lg:block xl:w-96"
    >
      <ProjectDetail key={project.id} project={project} onClose={onClose} />
    </aside>
  );
}
