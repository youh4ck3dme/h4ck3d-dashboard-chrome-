import type { Project } from '../data/projects';
import type { GitHubRepo } from './github';
import type { LocalProject, VercelProject } from './sources';
import { CATEGORIES, STATUSES, VISIBILITIES } from './filter';
import { safeExternalUrl } from './url';

export const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 100_000;
const optionalText = (v: unknown) => v == null || text(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));

export function isGitHubRepo(v: unknown): v is GitHubRepo {
  return (
    record(v) &&
    finite(v.id) &&
    text(v.name) &&
    text(v.full_name) &&
    text(v.html_url) &&
    optionalText(v.description) &&
    optionalText(v.language) &&
    optionalText(v.homepage) &&
    date(v.created_at) &&
    date(v.updated_at) &&
    (v.pushed_at === null || date(v.pushed_at)) &&
    finite(v.size) &&
    finite(v.stargazers_count) &&
    finite(v.forks_count) &&
    typeof v.private === 'boolean' &&
    typeof v.archived === 'boolean' &&
    typeof v.fork === 'boolean' &&
    text(v.default_branch) &&
    (v.topics === undefined || strings(v.topics))
  );
}

export function isVercelProject(v: unknown): v is VercelProject {
  if (
    !record(v) ||
    !text(v.id) ||
    !text(v.name) ||
    !optionalText(v.framework) ||
    !finite(v.createdAt) ||
    !finite(v.updatedAt) ||
    !Number.isFinite(new Date(v.updatedAt).getTime())
  )
    return false;
  if (
    v.link != null &&
    (!record(v.link) ||
      !['type', 'org', 'repo'].every((k) => optionalText(v.link && (v.link as Record<string, unknown>)[k])))
  )
    return false;
  if (
    v.latestDeployments !== undefined &&
    (!Array.isArray(v.latestDeployments) ||
      !v.latestDeployments.every(
        (d) => record(d) && text(d.url) && finite(d.createdAt) && optionalText(d.readyState),
      ))
  )
    return false;
  if (v.targets != null) {
    if (!record(v.targets)) return false;
    const p = v.targets.production;
    if (
      p != null &&
      (!record(p) ||
        !optionalText(p.url) ||
        !optionalText(p.readyState) ||
        (p.alias !== undefined && !strings(p.alias)))
    )
      return false;
  }
  return true;
}

export function isLocalProject(v: unknown): v is LocalProject {
  return (
    record(v) &&
    text(v.name) &&
    text(v.path) &&
    optionalText(v.description) &&
    optionalText(v.remoteUrl) &&
    (v.lastCommitDate == null || date(v.lastCommitDate)) &&
    (v.dependencies === undefined || strings(v.dependencies))
  );
}

export function isProjectList(v: unknown): v is Project[] {
  return (
    Array.isArray(v) &&
    v.length <= 10_000 &&
    v.every((p) => {
      if (!record(p)) return false;
      if (p.identityAliases !== undefined && !strings(p.identityAliases)) return false;
      return (
        ['id', 'name', 'story', 'businessPurpose', 'technicalPurpose', 'nextStep'].every((k) => text(p[k])) &&
        CATEGORIES.includes(p.category as Project['category']) &&
        STATUSES.includes(p.status as Project['status']) &&
        VISIBILITIES.includes(p.visibility as Project['visibility']) &&
        strings(p.tech) &&
        date(p.date) &&
        finite(p.maturity) &&
        Number.isInteger(p.maturity) &&
        p.maturity >= 1 &&
        p.maturity <= 5 &&
        typeof p.featured === 'boolean' &&
        ['Low', 'Medium', 'High'].includes(p.risk as string) &&
        ['githubUrl', 'caseStudyUrl', 'vercelUrl'].every(
          (k) => p[k] === undefined || (text(p[k]) && !!safeExternalUrl(p[k])),
        ) &&
        ['repoFullName', 'vercelState', 'localPath'].every((k) => p[k] === undefined || text(p[k])) &&
        (p.sources === undefined ||
          (strings(p.sources) && p.sources.every((s) => ['Static', 'GitHub', 'Vercel', 'Local'].includes(s))))
      );
    })
  );
}
