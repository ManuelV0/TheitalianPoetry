import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

// Funzione mount per esporre il widget
const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return () => root.unmount();
};

// Tipizzazione globale TypeScript per evitare errori
declare global {
  interface Window {
    MyPoetryApp: {
      mount: typeof mount;
    };
  }
}

// Funzione di inizializzazione widget
const initWidget = () => {
  // Se sei in sviluppo, monta subito nell'elemento #root
  if (import.meta.env.DEV) {
    const devRoot = document.getElementById('root');
    if (devRoot) {
      mount(devRoot);
      console.log('[DEV] Widget montato in sviluppo');
    }
  }
  // Esposizione globale (PRODUZIONE)
  window.MyPoetryApp = { mount };
  console.log('[PROD] Widget esposto come globale:', window.MyPoetryApp);
};

// Assicurati che sia ambiente browser
if (typeof window !== 'undefined') {
  initWidget();
}

// Supporto HMR per Vite (opzionale, serve solo in sviluppo)
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    document.querySelectorAll('#root').forEach(el => {
      // Pulizia manuale se necessario (opzionale)
    });
  });
}

export {};
