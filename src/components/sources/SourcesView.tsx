import { Github, Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { SourceCard, SourceConnected } from './SourceCard';
import { VercelConnector } from './VercelConnector';
import { LocalConnector } from './LocalConnector';
import { type LocalProject, type VercelProject } from '../../lib/sources';
import { type ExternalSource, type SourceCounts } from '../../hooks/useProjectSources';

interface SourcesViewProps {
  counts: SourceCounts;
  onOpenGitHub: () => void;
  onVercelLoaded: (items: VercelProject[]) => void | Promise<boolean>;
  onLocalLoaded: (items: LocalProject[], endpoint?: string) => void | Promise<boolean>;
  onClear: (source: ExternalSource) => void;
}

export function SourcesView({
  counts,
  onOpenGitHub,
  onVercelLoaded,
  onLocalLoaded,
  onClear,
}: SourcesViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <SourceCard
        icon={Github}
        title="GitHub"
        description="Všetky tvoje repozitáre vrátane súkromných. Vyber, ktoré sa majú zobraziť v timeline."
        count={counts.GitHub}
      >
        {counts.GitHub > 0 ? (
          <SourceConnected
            text={`${counts.GitHub} repozitárov importovaných`}
            onDisconnect={() => onClear('GitHub')}
            action={
              <Button variant="outline" onClick={onOpenGitHub}>
                Upraviť výber
              </Button>
            }
          />
        ) : (
          <Button variant="primary" className="w-full" onClick={onOpenGitHub}>
            <Github className="mr-2 h-4 w-4" />
            Pripojiť GitHub
          </Button>
        )}
      </SourceCard>

      <VercelConnector
        count={counts.Vercel}
        onLoaded={onVercelLoaded}
        onDisconnect={() => onClear('Vercel')}
      />

      <LocalConnector count={counts.Local} onLoaded={onLocalLoaded} onDisconnect={() => onClear('Local')} />

      <div className="flex items-start gap-2 px-1 pt-1">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-placeholder" aria-hidden />
        <p className="text-[11px] leading-relaxed text-placeholder">
          Projekty sa spájajú do jednej karty podľa GitHub repozitára (napr. h4ck3d/papi-hair-design-app),
          inak podľa názvu. Tokeny sa ukladajú iba v pamäti tejto relácie.
        </p>
      </div>
    </div>
  );
}
