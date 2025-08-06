import React from "react";

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{color:'red',background:'#111',padding:'1em', whiteSpace: 'pre-wrap'}}>
          <div><b>Errore Widget:</b></div>
          <div>{String(this.state.error)}</div>
          {this.state.error && this.state.error.stack && (
            <details style={{marginTop:8}}>
              <summary>Stack trace</summary>
              <pre>{this.state.error.stack}</pre>
            </details>
          )}
          <div style={{fontSize:'0.9em',marginTop:'1em'}}>
            Se vedi solo "Error" senza dettagli, significa che una fetch o funzione ha lanciato un errore generico.<br/>
            <b>Segnala questo testo allo sviluppatore!</b>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
