import type { Project } from '../data/projects';
export function StatsRow({ projects }: { projects: Project[] }) {
  const total = projects.length;
  const prod = projects.filter((p) => p.status === 'Production').length;
  const inProgress = projects.filter((p) => p.status === 'In Progress').length;
  const categories = new Set(projects.map((p) => p.category)).size;
  const stats = [
    {
      label: 'Total projects',
      value: total,
    },
    {
      label: 'Production',
      value: prod,
    },
    {
      label: 'In progress',
      value: inProgress,
    },
    {
      label: 'Categories',
      value: categories,
    },
  ];

  return (
    <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
          <span className="text-2xl font-medium text-primary">{s.value}</span>
          <span className="text-sm text-muted">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
