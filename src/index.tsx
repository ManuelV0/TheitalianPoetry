import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Extended TypeScript interfaces
declare global {
  interface Window {
    process?: {
      env: Record<string, string>;
      cwd: () => string;
      version: string;
      nextTick: (callback: () => void) => void;
    };
    MyPoetryApp?: {
      mount: (el: HTMLElement, config?: any) => void;
      unmount: (el: HTMLElement) => void;
    };
  }

  interface HTMLElement {
    _widgetRoot?: ReactDOM.Root;
  }
}

// Enhanced process polyfill
if (typeof window !== "undefined" && !window.process) {
  window.process = {
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PUBLIC_URL: window.location.origin
    },
    cwd: () => '/',
    version: process.version || '18.0.0',
    nextTick: (callback) => setTimeout(callback, 0)
  };
  console.debug("[POLYFILL] process configured");
}

// Environment verification
const verifyEnvironment = () => {
  console.groupCollapsed("[ENV CHECK]");
  console.log("React version:", React.version);
  console.log("Process.env.NODE_ENV:", window.process?.env?.NODE_ENV);
  console.groupEnd();
};

verifyEnvironment();

// Enhanced mount function
const mount = (el: HTMLElement, config: Record<string, unknown> = {}): void => {
  console.group("[MOUNT]");
  try {
    if (!el || !(el instanceof HTMLElement)) {
      throw new Error("Invalid DOM element provided");
    }

    console.debug("Mounting to:", el);
    console.debug("Configuration:", config);

    // Visual test
    el.innerHTML = '<div style="color:red;padding:1rem;">LOADING WIDGET...</div>';

    const root = ReactDOM.createRoot(el);
    root.render(
      <React.StrictMode>
        <App {...config} />
      </React.StrictMode>
    );

    el._widgetRoot = root;
    console.debug("Render completed");
  } catch (error) {
    console.error("Mount error:", error);
    if (el) {
      el.innerHTML = `
        <div style="color:white;background:red;padding:1rem;">
          ERROR: ${error instanceof Error ? error.message : String(error)}
        </div>
      `;
    }
    throw error;
  } finally {
    console.groupEnd();
  }
};

// Robust unmount function
const unmount = (el: HTMLElement): void => {
  console.group("[UNMOUNT]");
  try {
    if (!el?._widgetRoot) {
      console.warn("No React instance found");
      return;
    }

    el._widgetRoot.unmount();
    delete el._widgetRoot;
    el.innerHTML = '<div style="color:gray">Widget unmounted</div>';
    console.debug("Unmount completed");
  } catch (error) {
    console.error("Unmount error:", error);
  } finally {
    console.groupEnd();
  }
};

// Expose API with validation
if (typeof window !== "undefined") {
  const exposedAPI = {
    mount: (el: HTMLElement, config?: any) => {
      console.debug("[API] mount called");
      return mount(el, config);
    },
    unmount: (el: HTMLElement) => {
      console.debug("[API] unmount called");
      return unmount(el);
    }
  };

  window.MyPoetryApp = exposedAPI;
  console.debug("[EXPORT] API exposed", {
    methods: Object.keys(exposedAPI),
    version: process.env.REACT_APP_VERSION || '1.0.0'
  });
}

export { mount, unmount };
