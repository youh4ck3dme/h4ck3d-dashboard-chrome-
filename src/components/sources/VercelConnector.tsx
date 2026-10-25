import { useState } from 'react';
import { Loader2, Triangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { SourceCard, SourceConnected, SourceError } from './SourceCard';
import { type VercelProject, fetchVercelProjects } from '../../lib/sources';
import { useSourceRequest } from '../../hooks/useSourceRequest';

interface VercelConnectorProps {
  count: number;
  onLoaded: (items: VercelProject[]) => void;
  onDisconnect: () => void;
}

export function VercelConnector({ count, onLoaded, onDisconnect }: VercelConnectorProps) {
  const [token, setToken] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const request = useSourceRequest();

  const connect = async () => {
    if (!token.trim() || loading) return;
    setLoading(true);
    setError(null);
    const signal = request.begin();
    const result = await fetchVercelProjects(token.trim(), teamId.trim() || undefined, signal);
    if (signal.aborted) return;
    setToken('');
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onLoaded(result.items);
    setToken(''); // don't keep the token around once projects are loaded
    setConnected(true);
  };

  const disconnect = () => {
    request.cancel();
    setLoading(false);
    setToken('');
    setConnected(false);
    onDisconnect();
  };

  return (
    <SourceCard
      icon={Triangle}
      title="Vercel"
      description="Projekty, produkčné URL a stav posledného nasadenia. Párujú sa s GitHub repozitárom."
      count={count}
    >
      {connected || count > 0 ? (
        <SourceConnected text={`${count} projektov načítaných`} onDisconnect={disconnect} />
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            connect();
          }}
        >
          <TextField
            label="Vercel token"
            type="password"
            autoComplete="off"
            placeholder="vercel_xxxxxxxxxxxx"
            className="font-mono"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            hint={
              <>
                Vytvor na{' '}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted underline underline-offset-2 hover:text-primary"
                >
                  vercel.com/account/tokens
                </a>
              </>
            }
          />

          <TextField
            label="Team ID (voliteľné)"
            placeholder="team_xxxxxxxx"
            className="font-mono"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          />

          {error && <SourceError message={error} />}
          <Button type="submit" variant="primary" className="w-full" disabled={!token.trim() || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Triangle className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Načítavam…' : 'Pripojiť Vercel'}
          </Button>
        </form>
      )}
    </SourceCard>
  );
}
