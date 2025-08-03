import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

// Estensione dell'interfaccia globale per il widget
declare global {
  interface Window {
    MyPoetryApp: {
      mount: (container: HTMLElement) => () => void;
    };
  }
}

// Tipo per elemento root con estensione React
type ReactRootElement = HTMLElement & {
  _reactRoot?: ReactDOM.Root;
};

/**
 * Monta l'applicazione React nel DOM
 * @param el Elemento HTML container
 * @returns Funzione di cleanup
 */
const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el);
  (el as ReactRootElement)._reactRoot = root;

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  return () => {
    setTimeout(() => {
      root.unmount();
      delete (el as ReactRootElement)._reactRoot;
    }, 0);
  };
};

// Inizializzazione del widget
const initWidget = () => {
  // Modalità sviluppo: auto-mount
  if (import.meta.env.DEV) {
    const devRoot = document.getElementById('root');
    if (devRoot) {
      const cleanup = mount(devRoot);
      console.log('[DEV] Widget montato in sviluppo');

      // Hot Module Replacement
      if (import.meta.hot) {
        import.meta.hot.dispose(cleanup);
      }
    }
  }

  // Esposizione globale per produzione
  window.MyPoetryApp = { mount };
  console.log('[PROD] Widget esposto globalmente');
};

// Avvio sicuro in ambiente browser
if (typeof window !== 'undefined') {
  try {
    initWidget();
  } catch (error) {
    console.error('[ERROR] Inizializzazione fallita:', error);
  }
}

// Supporto avanzato HMR
if (import.meta.hot) {
  import.meta.hot.accept('./App', () => {
    document.querySelectorAll<ReactRootElement>('#root').forEach(el => {
      if (el._reactRoot) {
        const cleanup = mount(el);
        cleanup();
      }
    });
  });
}
