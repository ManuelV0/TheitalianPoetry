import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill avanzato per process
if (typeof window !== "undefined") {
  if (!window.process) {
    (window as any).process = {
      env: { 
        NODE_ENV: 'production',
        PUBLIC_URL: window.location.origin 
      },
      cwd: () => '/',
      version: '18.0.0',
      nextTick: (callback) => setTimeout(callback, 0)
    };
    console.log(">> [POLYFILL] process configurato");
  }

  // Verifica ambiente
  console.groupCollapsed(">> [ENV CHECK]");
  console.log("React:", window.React?.version);
  console.log("ReactDOM:", window.ReactDOM?.version);
  console.log("Process:", window.process?.env?.NODE_ENV);
  console.groupEnd();
}

// Funzione di mount potenziata
function mount(el: HTMLElement, config = {}) {
  console.group(">> [MOUNT]");
  try {
    if (!el) {
      throw new Error("Elemento DOM non fornito");
    }

    console.log("Elemento ricevuto:", el);
    console.log("Configurazione:", config);

    // Test visivo preliminare
    el.innerHTML = '<div style="color:red;padding:1rem;">TEST VISUALE</div>';

    // Delay per debug
    setTimeout(() => {
      const root = ReactDOM.createRoot(el);
      root.render(
        <React.StrictMode>
          <App {...config} />
        </React.StrictMode>
      );
      
      // Salva riferimento
      (el as any)._widgetRoot = root;
      console.log("Render completato");
    }, 500);

  } catch (error) {
    console.error("Errore durante il mount:", error);
    if (el) {
      el.innerHTML = `
        <div style="color:white;background:red;padding:1rem;">
          ERRORE: ${error.message}
        </div>
      `;
    }
    throw error;
  } finally {
    console.groupEnd();
  }
}

// Funzione di unmount robusta
function unmount(el: HTMLElement) {
  console.group(">> [UNMOUNT]");
  try {
    if (!el?._widgetRoot) {
      console.warn("Nessuna istanza React trovata");
      return;
    }

    el._widgetRoot.unmount();
    delete el._widgetRoot;
    el.innerHTML = '<div style="color:gray">Widget smontato</div>';
    console.log("Smontaggio completato");

  } catch (error) {
    console.error("Errore durante l'unmount:", error);
  } finally {
    console.groupEnd();
  }
}

// Esposizione globale con validazione
if (typeof window !== "undefined") {
  const exposedAPI = { 
    mount: (el: HTMLElement, config?: any) => {
      console.log("[API CALL] mount triggered");
      return mount(el, config);
    },
    unmount: (el: HTMLElement) => {
      console.log("[API CALL] unmount triggered");
      return unmount(el);
    }
  };

  (window as any).MyPoetryApp = exposedAPI;
  console.log(">> [EXPORT] API esposta:", {
    mount: exposedAPI.mount.length + " args",
    unmount: exposedAPI.unmount.length + " args"
  });
}

export { mount, unmount };
