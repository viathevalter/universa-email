import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary Caught Error]:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('universa_results_data');
      localStorage.removeItem('universa_jobs_data');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white p-6">
          <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">Recuperação do Sistema</h2>
              <p className="text-xs text-zinc-400">
                Ocorreu uma sobrecarga temporária de memória ou dados na visualização.
              </p>
            </div>

            {this.state.error && (
              <div className="p-2.5 rounded-lg bg-zinc-950 text-rose-400 font-mono text-[11px] text-left truncate">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Liberar Memória Temporária & Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
