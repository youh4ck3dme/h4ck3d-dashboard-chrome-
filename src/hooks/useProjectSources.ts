import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Project, projects as staticProjects } from '../data/projects';
import type { GitHubRepo } from '../lib/github';
import {
  type LocalProject,
  type VercelProject,
  githubToProject,
  localToProject,
  mergeProjects,
  vercelToProject,
} from '../lib/sources';
import { readJSON, writeJSON } from '../lib/storage';
import { isProjectList } from '../lib/validation';

export type ExternalSource = 'GitHub' | 'Vercel' | 'Local';

export interface SourceCounts {
  GitHub: number;
  Vercel: number;
  Local: number;
}

const STORAGE_VERSION = 1;
const STATIC = staticProjects.map((p) => ({ ...p, sources: ['Static' as const] }));

/**
 * Imported projects (never tokens) are persisted locally so the timeline
 * survives a reload or an offline start of the installed PWA.
 */
function usePersistedList(source: ExternalSource) {
  const key = `v${STORAGE_VERSION}:source:${source}`;
  const [list, setList] = useState<Project[]>(() => readJSON(key, [], isProjectList));
  useEffect(() => writeJSON(key, list), [key, list]);
  return [list, setList] as const;
}

export function useProjectSources() {
  const [github, setGithub] = usePersistedList('GitHub');
  const [vercel, setVercel] = usePersistedList('Vercel');
  const [local, setLocal] = usePersistedList('Local');

  const projects = useMemo(
    () =>
      github.length + vercel.length + local.length > 0 ? mergeProjects([github, vercel, local]) : STATIC,
    [github, vercel, local],
  );

  const importGitHub = useCallback(
    (repos: GitHubRepo[]) => setGithub(repos.map(githubToProject)),
    [setGithub],
  );
  const importVercel = useCallback(
    (items: VercelProject[]) => setVercel(items.map(vercelToProject)),
    [setVercel],
  );
  const importLocal = useCallback((items: LocalProject[]) => setLocal(items.map(localToProject)), [setLocal]);

  const clearSource = useCallback(
    (source: ExternalSource) => {
      if (source === 'GitHub') setGithub([]);
      if (source === 'Vercel') setVercel([]);
      if (source === 'Local') setLocal([]);
    },
    [setGithub, setVercel, setLocal],
  );

  const counts: SourceCounts = useMemo(
    () => ({ GitHub: github.length, Vercel: vercel.length, Local: local.length }),
    [github.length, vercel.length, local.length],
  );

  return { projects, counts, importGitHub, importVercel, importLocal, clearSource };
}
