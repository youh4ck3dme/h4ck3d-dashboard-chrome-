import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private reset = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('h4ck3d:'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="flex h-[100dvh] w-full items-center justify-center bg-app p-6 text-primary"
      >
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-lg font-medium">Niečo sa pokazilo</h1>
          <p className="mb-6 text-sm text-muted">
            Aplikácia narazila na neočakávanú chybu. Skús ju znova načítať.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-app"
            >
              Znova načítať
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="h-10 rounded-md border border-border px-4 text-sm text-muted hover:text-primary"
            >
              Vymazať uložené dáta
            </button>
          </div>
        </div>
      </div>
    );
  }
}
