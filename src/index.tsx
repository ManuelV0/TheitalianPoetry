// src/index.tsx

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // se usi Tailwind o CSS globale

// Polyfill process.env per ambienti tipo WordPress, CDN, ecc.
if (typeof window !== "undefined" && !window.process) {
  window.process = { env: { NODE_ENV: "production" } };
}

// MOUNT: funzione che puoi chiamare da fuori (es: loader CDN)
// Puoi accettare props/config (tema, lingua ecc) se vuoi
const mount = (el: HTMLElement, config?: any) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <App {...config} />
    </React.StrictMode>
  );
  // Per poter unmountare se vuoi (opzionale)
  (el as any)._widgetRoot = root;
};

// UNMOUNT: funzione di pulizia, se serve
const unmount = (el: HTMLElement) => {
  if ((el as any)._widgetRoot) {
    (el as any)._widgetRoot.unmount();
    delete (el as any)._widgetRoot;
    el.innerHTML = "<div style='color:gray'>Widget disattivato</div>";
  }
};

// Esporta globalmente su window
if (typeof window !== "undefined") {
  window.MyPoetryApp = { mount, unmount };
}

export { mount, unmount };
