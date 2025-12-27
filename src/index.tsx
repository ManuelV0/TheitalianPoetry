// src/index.tsx

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

// Polyfill process.env per ambienti tipo WordPress, CDN, ecc.
if (typeof window !== "undefined" && !(window as any).process) {
  (window as any).process = { env: { NODE_ENV: "production" } };
}

// Tipo opzionale di configurazione widget
type WidgetConfig = {
  supabase?: {
    url: string;
    anonKey: string;
  };
  theme?: "light" | "dark";
  onReady?: () => void;
  onError?: (err: any) => void;
};

// Funzione mount (widget mode)
const mount = (el: HTMLElement, config?: WidgetConfig) => {
  try {
    const root = ReactDOM.createRoot(el);

    root.render(
      <ErrorBoundary
        onError={(err) => {
          console.error("[Widget ErrorBoundary]", err);
          config?.onError?.(err);
        }}
      >
        <App widgetConfig={config} />
      </ErrorBoundary>
    );

    (el as any)._widgetRoot = root;

    config?.onReady?.();
  } catch (err) {
    console.error("[Widget mount error]", err);
    config?.onError?.(err);
  }
};

// Funzione unmount
const unmount = (el: HTMLElement) => {
  if ((el as any)._widgetRoot) {
    (el as any)._widgetRoot.unmount();
    delete (el as any)._widgetRoot;
    el.innerHTML = "<div style='color:gray'>Widget disattivato</div>";
  }
};

// Espone globalmente il widget
if (typeof window !== "undefined") {
  (window as any).MyPoetryApp = { mount, unmount };
}

export { mount, unmount };