import * as React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions so an unexpected error shows a recoverable
 * screen instead of a blank page. Without this, one bad value anywhere in the
 * tree leaves OMA staff with nothing but a white screen and no way forward.
 *
 * Note: React error boundaries only catch errors thrown while rendering. Failed
 * data requests are handled per page by TanStack Query and <ErrorState />.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kept in the console for support: there is no external error-reporting
    // service configured for this deployment.
    console.error("[AGRODATA] Unhandled UI error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The screen could not be displayed. Your saved data is not affected. Try reloading,
            or go back to the dashboard.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4" /> Reload page
            </Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              <Home className="h-4 w-4" /> Go to dashboard
            </Button>
          </div>

          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
              {error.message}
            </pre>
          </details>

          <p className="mt-4 text-xs text-muted-foreground">
            If this keeps happening, report the message above to the system administrator.
          </p>
        </div>
      </div>
    );
  }
}
