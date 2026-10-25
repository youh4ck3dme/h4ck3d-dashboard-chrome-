import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Project } from '../data/projects';
import { ProjectDetail } from './ProjectDetail';
import { useDialog } from '../hooks/useDialog';

interface MobileDetailPageProps {
  project: Project | null;
  onBack: () => void;
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches;

/** Full-screen detail route for phones/tablets that slides in like a native page. */
export function MobileDetailPage({ project, onBack }: MobileDetailPageProps) {
  const [shown, setShown] = useState<Project | null>(project);
  const ref = useRef<HTMLDivElement>(null);
  const open = project !== null;

  useEffect(() => {
    if (project) setShown(project);
  }, [project]);

  // Closed page stays mounted for the slide animation but must be unreachable by keyboard/AT.
  useEffect(() => {
    ref.current?.toggleAttribute('inert', !open);
  }, [open]);

  // Only behave as a modal (focus trap, Escape) where the page is actually visible.
  useDialog(open && isMobileViewport(), ref, onBack);

  // Hardware/browser back button closes the detail page instead of leaving the app.
  useEffect(() => {
    if (!open || !isMobileViewport()) return;
    window.history.pushState({ detail: true }, '');
    const onPop = () => onBack();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.detail) window.history.back();
    };
  }, [open, onBack]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={shown ? `${shown.name} detail` : undefined}
      className={`fixed inset-0 z-40 flex flex-col bg-app transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:hidden ${
        open ? 'visible translate-x-0' : 'invisible translate-x-full'
      }`}
    >
      <header className="pt-safe shrink-0 border-b border-border bg-app">
        <div className="flex h-14 items-center gap-1 px-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Späť"
            data-autofocus
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 active:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate pr-4 text-base font-medium text-primary">{shown?.name}</h1>
        </div>
      </header>

      <div className="scroll-y no-scrollbar min-h-0 flex-1">
        <div className="mx-auto max-w-2xl p-4 pb-8">
          {shown && <ProjectDetail key={shown.id} project={shown} />}
        </div>
        <div className="pb-safe" />
      </div>
    </div>
  );
}
