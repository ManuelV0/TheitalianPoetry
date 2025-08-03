import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

// 1. Definizione del tipo globale
declare global {
  interface Window {
    MyPoetryApp: {
      mount: (el: HTMLElement) => () => void;
    };
  }
}

// 2. Funzione mount principale
const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // 3. Funzione di cleanup corretta
  return () => {
    setTimeout(() => {
      root.unmount();
    }, 0);
  };
};

// 4. Inizializzazione controllata
const initWidget = () => {
  // Modalità sviluppo
  if (import.meta.env.DEV) {
    const devRoot = document.getElementById('root');
    if (devRoot) {
      const cleanup = mount(devRoot);
      console.log('[DEV] Widget montato in sviluppo');
      
      // Cleanup per hot-reload
      if (import.meta.hot) {
        import.meta.hot.dispose(cleanup);
      }
    }
  }

  // Esposizione globale
  window.MyPoetryApp = { mount };
  console.log('[PROD] Widget esposto:', window.MyPoetryApp);
};

// 5. Avvio sicuro
if (typeof window !== 'undefined') {
  try {
    initWidget();
  } catch (error) {
    console.error('[ERROR] Initialization failed:', error);
  }
}

// 6. Supporto HMR avanzato
if (import.meta.hot) {
  import.meta.hot.accept('./App', () => {
    const roots = document.querySelectorAll('#root');
    roots.forEach(el => {
      if (el._reactRoot) {
        const cleanup = mount(el);
        cleanup();
      }
    });
  });
}
