import { useState } from 'react';
import { HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { SourceCard, SourceConnected, SourceError } from './SourceCard';
import { type LocalProject, fetchLocalProjects } from '../../lib/sources';
import { localEndpoint } from '../../offline/engine';
import { useSourceRequest } from '../../hooks/useSourceRequest';

interface LocalConnectorProps {
  count: number;
  onLoaded: (items: LocalProject[], endpoint?: string) => void | Promise<boolean>;
  onDisconnect: () => void;
}

export function LocalConnector({ count, onLoaded, onDisconnect }: LocalConnectorProps) {
  const [url, setUrl] = useState('http://localhost:3001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const request = useSourceRequest();

  const scan = async () => {
    if (!url.trim() || loading) return;
    let endpoint: string;
    try {
      endpoint = localEndpoint(url.trim());
    } catch {
      setError('Použi loopback adresu skenera bez prihlasovacích údajov.');
      return;
    }
    setLoading(true);
    setError(null);
    const signal = request.begin();
    const result = await fetchLocalProjects(url.trim(), signal);
    if (signal.aborted) return;
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if ((await onLoaded(result.items, endpoint)) === false) return;
    setConnected(true);
  };

  const disconnect = () => {
    request.cancel();
    setLoading(false);
    setConnected(false);
    onDisconnect();
  };

  return (
    <SourceCard
      icon={HardDrive}
      title="Lokálne projekty"
      description="Priečinky z tvojho disku cez lokálny server. Adresa git remote ich spáruje s GitHubom a Vercelom."
      count={count}
    >
      {connected || count > 0 ? (
        <SourceConnected
          text={`${count} lokálnych projektov`}
          onDisconnect={disconnect}
          action={
            <Button variant="outline" onClick={scan} disabled={loading} aria-label="Znova prehľadať">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          }
        />
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            scan();
          }}
        >
          <TextField
            label="Adresa lokálneho servera"
            type="url"
            inputMode="url"
            className="font-mono"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            hint="Server musí bežať na tvojom počítači (npm run server)."
          />

          <Button type="submit" variant="primary" className="w-full" disabled={!url.trim() || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Prehľadávam…' : 'Prehľadať projekty'}
          </Button>
        </form>
      )}
      {error && <SourceError message={error} />}
    </SourceCard>
  );
}
