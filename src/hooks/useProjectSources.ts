import { useCallback, useEffect, useMemo } from 'react';
import { projects as staticProjects } from '../data/projects';
import type { GitHubRepo } from '../lib/github';
import {
  type LocalProject,
  type VercelProject,
  githubToProject,
  localToProject,
  mergeProjects,
  vercelToProject,
} from '../lib/sources';
import { clearOfflineSource, importSnapshot, startOffline, useOfflineState } from '../offline/store';
import type { Source } from '../offline/db';
export type ExternalSource = Source;
export interface SourceCounts {
  GitHub: number;
  Vercel: number;
  Local: number;
}
const STATIC = staticProjects.map((p) => ({ ...p, sources: ['Static' as const] }));
export function useProjectSources() {
  const state = useOfflineState();
  useEffect(() => {
    void startOffline();
  }, []);
  const projects = useMemo(
    () =>
      state.snapshots.some((s) => s.projects.length)
        ? mergeProjects(state.snapshots.map((s) => s.projects))
        : STATIC,
    [state.snapshots],
  );
  const importGitHub = useCallback((repos: GitHubRepo[]) => {
    return importSnapshot('GitHub', repos.map(githubToProject));
  }, []);
  const importVercel = useCallback((items: VercelProject[]) => {
    return importSnapshot('Vercel', items.map(vercelToProject));
  }, []);
  const importLocal = useCallback((items: LocalProject[], endpoint?: string) => {
    return importSnapshot('Local', items.map(localToProject), endpoint);
  }, []);
  const clearSource = useCallback((source: Source) => {
    void clearOfflineSource(source);
  }, []);
  const counts: SourceCounts = useMemo(
    () => ({
      GitHub: state.snapshots.find((s) => s.source === 'GitHub')?.projects.length ?? 0,
      Vercel: state.snapshots.find((s) => s.source === 'Vercel')?.projects.length ?? 0,
      Local: state.snapshots.find((s) => s.source === 'Local')?.projects.length ?? 0,
    }),
    [state.snapshots],
  );
  return { projects, counts, importGitHub, importVercel, importLocal, clearSource };
}
