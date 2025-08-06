import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: any;
  errorInfo: any;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ hasError: true, error, errorInfo });
    // Qui puoi anche loggare su un servizio esterno se vuoi
    if (window && typeof window !== "undefined") {
      (window as any).LAST_WIDGET_ERROR = { error, errorInfo };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "red", background: "#222", padding: "2rem" }}>
          <h2>Errore Widget:</h2>
          <pre>Error: {this.state.error ? String(this.state.error) : "Unknown error"}</pre>
          <details style={{ whiteSpace: "pre-wrap", color: "white" }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
