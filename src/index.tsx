// src/index.tsx

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary"; // importa l'ErrorBoundary
import "./index.css";

// Polyfill process.env per ambienti tipo WordPress, CDN, ecc.
if (typeof window !== "undefined" && !window.process) {
  window.process = { env: { NODE_ENV: "production" } };
}

// Funzione mount
const mount = (el: HTMLElement, config?: any) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <ErrorBoundary>
      <App {...config} />
    </ErrorBoundary>
  );
  (el as any)._widgetRoot = root;
};

// Funzione unmount
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
