import { Component, type ErrorInfo, type ReactNode } from "react";

type ContextErrorBoundaryProps = {
  name: string;
  children: ReactNode;
  onReset?: () => void;
  fallbackMessage?: string;
};

type ContextErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ContextErrorBoundary extends Component<ContextErrorBoundaryProps, ContextErrorBoundaryState> {
  state: ContextErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ContextErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(`[ContextErrorBoundary:${this.props.name}]`, error, info);
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { name, fallbackMessage } = this.props;
      return (
        <div
          role="alert"
          className="m-4 rounded-xl border app-ring bg-[color-mix(in_oklab,var(--panel),white_70%)] p-4 text-sm"
          style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            {name}
          </div>
          <p className="mt-2" style={{ color: "var(--foreground)" }}>
            {fallbackMessage ?? "We ran into an issue loading the demo data. You can reset and continue working."}
          </p>
          {this.state.error ? (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-red-300">
              {this.state.error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] hover:bg-white/15"
          >
            Reset demo data
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

