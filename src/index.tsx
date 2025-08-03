import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Log all'inizio dell'entrypoint
console.log(">> WidgetApp ENTRYPOINT loaded");

// Funzione che monta il widget su un elemento DOM passato
function mount(element: HTMLElement) {
  console.log(">> MyPoetryApp.mount CHIAMATA con", element);
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Esposizione globale: window.MyPoetryApp.mount
if (typeof window !== "undefined") {
  console.log(">> Sto esponendo MyPoetryApp su window...");
  (window as any).MyPoetryApp = { mount };
  console.log(">> MyPoetryApp globale:", window.MyPoetryApp);
}

export { mount }; // Utile per eventuali test o import interni
