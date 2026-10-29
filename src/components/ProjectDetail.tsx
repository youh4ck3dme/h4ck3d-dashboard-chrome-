import { Check, ExternalLink, Github, HardDrive, Plus, Triangle, X } from 'lucide-react';
import type { Project } from '../data/projects';
import { displayHost, safeExternalUrl } from '../lib/url';
import { formatDate } from '../lib/date';
import { categoryLabel, statusLabel, t, visibilityLabel } from '../lib/i18n';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { buttonClassName } from './ui/buttonStyles';
import { MaturityBar } from './ui/MaturityBar';
import { RiskBar } from './ui/RiskBar';
import { useOfflineState, roadmapValue, updateRoadmap } from '../offline/store';

interface ProjectDetailProps {
  project: Project;
  onClose?: () => void;
}

export function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  useOfflineState();
  const onRoadmap = roadmapValue(project);
  const dateStr = formatDate(project.date, 'long');
  const githubUrl = safeExternalUrl(project.githubUrl);
  const vercelUrl = safeExternalUrl(project.vercelUrl);
  const caseStudyUrl = safeExternalUrl(project.caseStudyUrl);

  const meta = [
    { label: t.detail.category, value: categoryLabel[project.category] },
    { label: t.detail.status, value: statusLabel[project.status] },
    { label: t.detail.visibility, value: visibilityLabel[project.visibility] },
    { label: t.detail.date, value: dateStr },
  ];

  const links = [
    { icon: Github, label: 'GitHub', value: project.repoFullName },
    {
      icon: Triangle,
      label: 'Vercel',
      value: vercelUrl
        ? `${displayHost(vercelUrl)}${project.vercelState ? ` · ${project.vercelState}` : ''}`
        : undefined,
    },
    { icon: HardDrive, label: 'Local', value: project.localPath },
  ];

  return (
    <div className="flex flex-col gap-8" data-selectable>
      <div>
        {onClose && (
          <div className="mb-2 flex items-start justify-between gap-4">
            <h2 className="min-w-0 break-words text-lg font-medium leading-tight text-primary">
              {project.name}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={t.detail.close}
              className="-mr-2 -mt-1 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-sm leading-relaxed text-muted">{project.story}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="mb-1 text-xs text-muted">{m.label}</dt>
            <dd className="text-primary">{m.value}</dd>
          </div>
        ))}
        <div>
          <dt className="mb-1.5 text-xs text-muted">{t.detail.maturity}</dt>
          <dd>
            <MaturityBar level={project.maturity} />
          </dd>
        </div>
      </dl>

      {project.tech.length > 0 && (
        <div>
          <span className="mb-2 block text-xs text-muted">{t.detail.stack}</span>
          <div className="flex flex-wrap gap-2">
            {project.tech.map((tech) => (
              <Badge key={tech}>{tech}</Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="mb-2 block text-xs text-muted">{t.detail.links}</span>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {links.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex min-h-[44px] items-center gap-3 px-3 py-2">
              <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
              <span
                title={value}
                className={`min-w-0 truncate text-xs ${value ? 'font-mono text-primary' : 'text-placeholder'}`}
              >
                {value ?? t.detail.notConnected}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="h-px w-full bg-border" />

      <div>
        <h3 className="mb-2 text-sm font-medium text-primary">{t.detail.business}</h3>
        <p className="text-sm leading-relaxed text-muted">{project.businessPurpose}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-primary">{t.detail.technical}</h3>
        <p className="text-sm leading-relaxed text-muted">{project.technicalPurpose}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">{t.detail.risk}</span>
        <RiskBar level={project.risk} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-primary">{t.detail.nextStep}</h3>
        <p className="text-sm text-muted">{project.nextStep}</p>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('primary', 'md', 'w-full')}
          >
            <Github className="mr-2 h-4 w-4" />
            {t.detail.openGitHub}
          </a>
        ) : (
          <Button variant="primary" className="w-full" disabled>
            <Github className="mr-2 h-4 w-4" />
            {t.detail.openGitHub}
          </Button>
        )}

        {vercelUrl && (
          <a
            href={vercelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('outline', 'md', 'w-full')}
          >
            <Triangle className="mr-2 h-4 w-4" />
            {t.detail.openVercel}
          </a>
        )}

        <div className="grid grid-cols-2 gap-2">
          {caseStudyUrl ? (
            <a
              href={caseStudyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName('outline', 'md', 'w-full')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t.detail.caseStudy}
            </a>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t.detail.caseStudy}
            </Button>
          )}
          <Button
            variant="outline"
            className={`w-full ${onRoadmap ? 'bg-surface-2 text-primary' : ''}`}
            aria-pressed={onRoadmap}
            onClick={() => {
              void updateRoadmap(project, !onRoadmap);
            }}
          >
            {onRoadmap ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {onRoadmap ? t.detail.onRoadmap : t.detail.roadmap}
          </Button>
        </div>
      </div>
    </div>
  );
}
