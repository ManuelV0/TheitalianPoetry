import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill per process
if (typeof window !== "undefined" && !window.process) {
  (window as any).process = {
    env: { NODE_ENV: 'production' },
    cwd: () => '/',
    version: ''
  };
}

console.log(">> [INIT] WidgetApp ENTRYPOINT loaded");

// Funzione di mount
function mount(el: HTMLElement, config?: any) {
  console.log(">> [MOUNT] Chiamato con elemento:", el);
  
  try {
    const root = ReactDOM.createRoot(el);
    root.render(
      <React.StrictMode>
        <App {...config} />
      </React.StrictMode>
    );
    
    // Salva riferimento per unmount
    (el as any)._widgetRoot = root;
    console.log(">> [MOUNT] Completato con successo");
  } catch (error) {
    console.error(">> [MOUNT ERROR]", error);
    throw error;
  }
}

// Funzione di unmount
function unmount(el: HTMLElement) {
  console.log(">> [UNMOUNT] Chiamato per elemento:", el);
  
  if (el?._widgetRoot) {
    el._widgetRoot.unmount();
    delete el._widgetRoot;
    console.log(">> [UNMOUNT] Completato");
  } else {
    console.warn(">> [UNMOUNT] Nessun root trovato");
  }
}

// Esposizione globale
if (typeof window !== "undefined") {
  console.log(">> [EXPOSE] Registrazione globale...");
  (window as any).MyPoetryApp = { mount, unmount };
  console.log(">> [EXPOSE] MyPoetryApp registrato:", {
    mount: typeof mount,
    unmount: typeof unmount
  });
}

export { mount, unmount };
