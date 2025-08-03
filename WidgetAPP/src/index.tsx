import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return () => root.unmount();
};

// Tipo globale TypeScript
declare global {
  interface Window {
    MyPoetryApp: {
      mount: typeof mount;
    };
  }
}

// Inizializzazione widget
const initWidget = () => {
  // Modalità sviluppo
  if (import.meta.env.DEV) {
    const devRoot = document.getElementById('root');
    if (devRoot) {
      mount(devRoot);
      console.log('[DEV] Widget montato in sviluppo');
    }
  }

  // Esposizione globale
  window.MyPoetryApp = { mount };
  console.log('[PROD] Widget esposto come globale:', window.MyPoetryApp);
};

// Verifica ambiente browser
if (typeof window !== 'undefined') {
  initWidget();
}

// Supporto HMR per Vite
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    document.querySelectorAll('#root').forEach(el => {
      el?.unmount?.();
    });
  });
}
