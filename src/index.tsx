import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Funzione che monta il widget su un elemento DOM passato
function mount(element: HTMLElement) {
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Esposizione globale: window.MyPoetryApp.mount
if (typeof window !== "undefined") {
  (window as any).MyPoetryApp = { mount };
}

export { mount }; // Utile per eventuali test o import interni
