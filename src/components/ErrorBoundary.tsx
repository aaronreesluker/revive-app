"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log error to your error reporting service
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--background)" }}>
          <div className="w-full max-w-md text-center">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/15">
              <AlertTriangle size={40} className="text-rose-400" />
            </div>

            {/* Content */}
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
              Something went wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>

            {/* Error details (collapsible in production) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left rounded-lg border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                  <Bug size={14} />
                  Error Details
                </summary>
                <pre className="mt-3 overflow-x-auto text-xs p-2 rounded bg-black/20" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {"\n\nStack trace:\n"}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={this.handleReset} className="inline-flex items-center gap-2 w-full sm:w-auto">
                <RefreshCw size={16} />
                Try Again
              </Button>
              <Button variant="secondary" onClick={this.handleGoHome} className="inline-flex items-center gap-2 w-full sm:w-auto">
                <Home size={16} />
                Go Home
              </Button>
            </div>

            {/* Support link */}
            <p className="mt-6 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based wrapper for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
