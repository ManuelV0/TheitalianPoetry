// src/ErrorBoundary.tsx
import React from "react";

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{color:'red',background:'#111',padding:'1em'}}>
          Errore Widget: {String(this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
}
