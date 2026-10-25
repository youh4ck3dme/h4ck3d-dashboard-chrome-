import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { MobileFilters } from './components/MobileFilters';
import { StatsRow } from './components/StatsRow';
import { FeaturedProjects } from './components/FeaturedProjects';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { EmptyState } from './components/EmptyState';
import { GitHubPanel } from './components/GitHubPanel';
import { BottomNav, type MobileTab } from './components/BottomNav';
import { MobileDetailPage } from './components/MobileDetailPage';
import { SourcesView } from './components/sources/SourcesView';
import { SourcesModal } from './components/sources/SourcesModal';
import { useProjectSources } from './hooks/useProjectSources';
import { useWelcomeScreen } from './hooks/useWelcomeScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { type FilterState, filterProjects, hasActiveFilters, initialFilterState } from './lib/filter';

export function App() {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const welcome = useWelcomeScreen();

  // App renders underneath from the start but stays unreachable while the splash is up.
  useEffect(() => {
    appRef.current?.toggleAttribute('inert', welcome.show);
  }, [welcome.show]);

  const sources = useProjectSources();
  const { projects, counts } = sources;
  const connectedCount = [counts.GitHub, counts.Vercel, counts.Local].filter((c) => c > 0).length;

  const filteredProjects = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const filtersActive = hasActiveFilters(filters);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [mobileTab]);

  // Drop a stale selection if its project disappears (e.g. a source was disconnected).
  useEffect(() => {
    if (selectedId && !selectedProject) setSelectedId(null);
  }, [selectedId, selectedProject]);

  const toggleSelect = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);
  const closeSources = useCallback(() => setSourcesOpen(false), []);
  const closeGitHub = useCallback(() => setGithubOpen(false), []);
  const openGitHub = useCallback(() => {
    setSourcesOpen(false);
    setGithubOpen(true);
  }, []);

  const sourcesView = (
    <SourcesView
      counts={counts}
      onOpenGitHub={openGitHub}
      onVercelLoaded={sources.importVercel}
      onLocalLoaded={sources.importLocal}
      onClear={sources.clearSource}
    />
  );

  return (
    <>
      {welcome.show && <WelcomeScreen phase={welcome.phase} />}
      <div
        ref={appRef}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-app font-sans text-primary"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-app"
        >
          Skip to content
        </a>
        <TopBar
          filters={filters}
          setFilters={setFilters}
          onSourcesClick={() => setSourcesOpen(true)}
          connectedCount={connectedCount}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar filters={filters} setFilters={setFilters} />

          <main
            id="main"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col overflow-hidden focus:outline-none"
          >
            {mobileTab === 'timeline' && <MobileFilters filters={filters} setFilters={setFilters} />}

            <div
              ref={scrollRef}
              className="scroll-y no-scrollbar min-h-0 flex-1 px-4 py-6 md:px-8 md:py-8 lg:p-12"
            >
              <div className="mx-auto max-w-4xl">
                <section className={mobileTab === 'timeline' ? '' : 'hidden lg:block'}>
                  <header className="mb-8 lg:mb-12">
                    <h1 className="mb-2 text-2xl font-medium text-primary md:text-3xl">
                      H4CK3D Project Timeline
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                      From prototypes to production-grade PWA, SaaS, AI, Firebase, WordPress and DevOps
                      systems.
                    </p>
                  </header>

                  <StatsRow projects={projects} />

                  <p className="mb-6 text-xs leading-relaxed text-muted" role="status">
                    {connectedCount === 0
                      ? 'Ukážkové údaje — pripoj zdroj pre svoje skutočné projekty. Stavy a popisy ukážok nie sú overené.'
                      : 'Importované metadáta. Kategória, vyspelosť a riziko sú odhady, nie výsledok auditu projektu.'}
                  </p>

                  {!filtersActive && (
                    <FeaturedProjects
                      projects={projects}
                      selectedId={selectedId}
                      onSelect={toggleSelect}
                      limit={6}
                    />
                  )}

                  <p className="sr-only" aria-live="polite">
                    {filteredProjects.length} projects shown
                  </p>

                  {filteredProjects.length > 0 ? (
                    <Timeline projects={filteredProjects} selectedId={selectedId} onSelect={toggleSelect} />
                  ) : (
                    <EmptyState onClear={() => setFilters(initialFilterState)} />
                  )}
                </section>

                <section className={mobileTab === 'featured' ? 'lg:hidden' : 'hidden'}>
                  <FeaturedProjects projects={projects} selectedId={selectedId} onSelect={toggleSelect} />
                </section>

                <section className={mobileTab === 'sources' ? 'lg:hidden' : 'hidden'}>
                  <header className="mb-6">
                    <h1 className="mb-2 text-2xl font-medium text-primary">Zdroje</h1>
                    <p className="text-sm leading-relaxed text-muted">
                      Prepoj GitHub, Vercel a lokálne projekty do jednej timeline.
                    </p>
                  </header>
                  {sourcesView}
                </section>
              </div>
            </div>
          </main>

          <Inspector project={selectedProject} onClose={closeDetail} />
        </div>

        <BottomNav active={mobileTab} onChange={setMobileTab} connectedCount={connectedCount} />

        <MobileDetailPage project={selectedProject} onBack={closeDetail} />
        <SourcesModal open={sourcesOpen} onClose={closeSources}>
          {sourcesView}
        </SourcesModal>
        <GitHubPanel isOpen={githubOpen} onClose={closeGitHub} onImport={sources.importGitHub} />
      </div>
    </>
  );
}
