import React from "react";
import { RefreshCcw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showStack: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showStack: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showStack: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
          <div className="w-full max-w-lg space-y-6">
            {/* Error icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-950/50">
                <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                An unexpected error occurred. We've logged the details for debugging.
              </p>
            </div>

            {/* Error message */}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 break-words">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>

            {/* Stack trace toggle */}
            {this.state.errorInfo && (
              <div>
                <button
                  onClick={() => this.setState((s) => ({ showStack: !s.showStack }))}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  {this.state.showStack ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {this.state.showStack ? "Hide" : "Show"} technical details
                </button>
                {this.state.showStack && (
                  <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-slate-950 p-4 text-[10px] leading-relaxed text-slate-300 font-mono">
                    {this.state.error?.stack}
                    {"\n\nComponent Stack:"}
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Reload Page
              </button>
            </div>

            {/* Branding */}
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-600">
              Print Estimator Pro v2.0.0
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
