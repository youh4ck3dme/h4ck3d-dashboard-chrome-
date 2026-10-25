import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Archive, Check, GitFork, Github, Loader2, Lock, Star, Unlock, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  type GitHubRepo,
  fetchAllRepos,
  inferCategory,
  inferMaturity,
  inferStatus,
  repoToLanguageTags,
} from '../lib/github';
import { useDialog } from '../hooks/useDialog';

interface GitHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (repos: GitHubRepo[]) => void;
}

type ViewState = 'input' | 'loading' | 'repos' | 'error';

const dateFormat = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' });

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted transition-colors hover:text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="flex h-3.5 w-3.5 items-center justify-center rounded border border-border peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-1 peer-focus-visible:ring-white/40"
      >
        {checked && <Check className="h-2.5 w-2.5 text-app" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

export function GitHubPanel({ isOpen, onClose, onImport }: GitHubPanelProps) {
  const [token, setToken] = useState('');
  const [viewState, setViewState] = useState<ViewState>('input');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [error, setError] = useState('');
  const [rateLimit, setRateLimit] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [showPrivate, setShowPrivate] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showForks, setShowForks] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useDialog(isOpen, dialogRef, onClose);

  // Cancel an in-flight request if the panel closes or unmounts.
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      setToken('');
      setRepos([]);
      setSelectedIds(new Set());
      setViewState('input');
      setFilterText('');
      setError('');
    }
  }, [isOpen]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const filteredRepos = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return repos.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q))
        return false;
      if (!showPrivate && r.private) return false;
      if (!showArchived && r.archived) return false;
      if (!showForks && r.fork) return false;
      return true;
    });
  }, [repos, filterText, showPrivate, showArchived, showForks]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    const value = token.trim();
    if (!value || viewState === 'loading') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setViewState('loading');
    setError('');
    const result = await fetchAllRepos(value, controller.signal);
    if (controller.signal.aborted) return;
    setToken('');
    setRateLimit(result.rateLimitRemaining);
    if (result.error) {
      setError(result.error);
      setViewState('input');
    } else {
      setRepos(result.repos);
      setViewState('repos');
    }
  };

  const handleDisconnect = () => {
    abortRef.current?.abort();
    setToken('');
    setRepos([]);
    setSelectedIds(new Set());
    setViewState('input');
    setError('');
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleImport = () => {
    onImport(repos.filter((r) => selectedIds.has(r.id)));
    setToken(''); // token is no longer needed once repos are imported
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-title"
        tabIndex={-1}
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-app focus:outline-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="github-title" className="text-base font-medium text-primary">
              GitHub Sync
            </h2>
            {viewState === 'repos' && (
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">
                {repos.length} repozitárov
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Zavrieť" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="scroll-y no-scrollbar flex-1">
          {viewState === 'input' && (
            <form
              className="flex flex-col gap-6 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleConnect();
              }}
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-primary">Pripoj svoj GitHub účet</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Zadaj Personal Access Token (PAT) na načítanie repozitárov. Odporúčame fine-grained token s
                  prístupom <em>Metadata: read-only</em>; klasický token potrebuje scope{' '}
                  <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px]">repo</code> pre
                  súkromné repozitáre.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label htmlFor="gh-token" className="text-xs font-medium uppercase tracking-wide text-muted">
                  Personal Access Token
                </label>
                <input
                  id="gh-token"
                  type="password"
                  data-autofocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="github_pat_… / ghp_…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                <p className="text-[11px] text-placeholder">
                  Vytvor token na{' '}
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted underline underline-offset-2 hover:text-primary"
                  >
                    github.com/settings/tokens
                  </a>
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-muted">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" className="h-10 w-full" disabled={!token.trim()}>
                <Github className="mr-2 h-4 w-4" aria-hidden />
                Pripojiť a načítať repozitáre
              </Button>
            </form>
          )}

          {viewState === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 p-12" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden />
              <p className="text-sm text-muted">Načítavam repozitáre z GitHubu…</p>
            </div>
          )}

          {viewState === 'error' && (
            <div className="flex flex-col gap-6 p-6">
              <div
                role="alert"
                className="flex items-start gap-3 rounded-md border border-border bg-surface p-4"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                <div>
                  <h4 className="mb-1 text-sm font-medium text-primary">Chyba pripojenia</h4>
                  <p className="text-xs text-muted">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setViewState('input')} className="w-full">
                Skúsiť znova
              </Button>
            </div>
          )}

          {viewState === 'repos' && (
            <div className="flex flex-col">
              <div className="sticky top-0 z-10 flex shrink-0 flex-col gap-3 border-b border-border bg-app p-4">
                <input
                  type="search"
                  aria-label="Hľadať repozitáre"
                  placeholder="Hľadať repozitáre…"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-surface px-3 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <FilterCheckbox label="Private" checked={showPrivate} onChange={setShowPrivate} />
                  <FilterCheckbox label="Archived" checked={showArchived} onChange={setShowArchived} />
                  <FilterCheckbox label="Forks" checked={showForks} onChange={setShowForks} />
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(filteredRepos.map((r) => r.id)))}
                      className="text-[11px] text-muted transition-colors hover:text-primary"
                    >
                      Vybrať všetky
                    </button>
                    <span className="text-border" aria-hidden>
                      |
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] text-muted transition-colors hover:text-primary"
                    >
                      Zrušiť výber
                    </button>
                  </div>
                </div>
                <div
                  className="flex items-center justify-between text-[11px] text-placeholder"
                  aria-live="polite"
                >
                  <span>
                    {filteredRepos.length} z {repos.length} repozitárov
                  </span>
                  <span>{selectedIds.size} vybraných</span>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {filteredRepos.map((repo) => {
                  const isSelected = selectedIds.has(repo.id);
                  const tags = repoToLanguageTags(repo);
                  const status = inferStatus(repo);
                  const maturity = inferMaturity(repo);
                  return (
                    <li key={repo.id}>
                      <label
                        className={`flex min-h-[44px] cursor-pointer items-start gap-3 p-4 transition-colors ${
                          isSelected ? 'bg-surface-2' : 'hover:bg-surface'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isSelected}
                          onChange={() => toggleSelect(repo.id)}
                        />
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-white/40 ${
                            isSelected ? 'border-primary bg-primary' : 'border-border'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-app" strokeWidth={3} />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="mb-1 flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-primary">{repo.name}</span>
                            {repo.private ? (
                              <Lock className="h-3 w-3 shrink-0 text-placeholder" aria-label="Private" />
                            ) : (
                              <Unlock className="h-3 w-3 shrink-0 text-placeholder" aria-label="Public" />
                            )}
                            {repo.archived && (
                              <Archive className="h-3 w-3 shrink-0 text-placeholder" aria-label="Archived" />
                            )}
                            {repo.fork && (
                              <GitFork className="h-3 w-3 shrink-0 text-placeholder" aria-label="Fork" />
                            )}
                          </span>
                          {repo.description && (
                            <span className="mb-2 line-clamp-1 block text-xs text-muted">
                              {repo.description}
                            </span>
                          )}
                          <span className="flex flex-wrap items-center gap-2">
                            <Badge>{inferCategory(repo)}</Badge>
                            <Badge
                              variant="status"
                              statusType={status === 'Production' ? 'filled' : 'outline'}
                            >
                              {status}
                            </Badge>
                            {tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] text-placeholder">
                                {t}
                              </span>
                            ))}
                            {repo.stargazers_count > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-placeholder">
                                <Star className="h-2.5 w-2.5" aria-hidden /> {repo.stargazers_count}
                              </span>
                            )}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-[11px] text-placeholder">
                            {dateFormat.format(new Date(repo.pushed_at || repo.created_at))}
                          </span>
                          <span
                            className="mt-1.5 flex justify-end gap-0.5"
                            aria-label={`Maturity ${maturity}/5`}
                          >
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span
                                key={i}
                                className={`h-1.5 w-1 rounded-sm ${i <= maturity ? 'bg-primary' : 'bg-surface-3'}`}
                              />
                            ))}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {filteredRepos.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted">Žiadne repozitáre nezodpovedajú filtru.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {viewState === 'repos' && (
          <div className="pb-safe flex shrink-0 items-center justify-between gap-3 border-t border-border bg-app p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted">
                Odpojiť
              </Button>
              {rateLimit !== null && (
                <span className="hidden text-[11px] text-placeholder sm:inline">
                  API limit: {rateLimit} zostáva
                </span>
              )}
            </div>
            <Button variant="primary" onClick={handleImport} disabled={selectedIds.size === 0}>
              Importovať {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} do timeline
            </Button>
          </div>
        )}

        {viewState === 'input' && (
          <div className="shrink-0 border-t border-border p-4">
            <p className="text-center text-[11px] text-placeholder">
              🔒 Token sa neukladá — zostáva iba v pamäti počas tejto relácie a posiela sa len na
              api.github.com.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
