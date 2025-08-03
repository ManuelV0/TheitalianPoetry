import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App'

const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  return () => root.unmount()
}

// Solo per sviluppo locale
if (process.env.NODE_ENV === 'development') {
  const devRoot = document.getElementById('root')
  if (devRoot) {
    mount(devRoot)
  }
}

// Esposizione globale per produzione
declare global {
  interface Window {
    MyPoetryApp: {
      mount: typeof mount
    }
  }
}

// Iniezione esplicita nell'oggetto window
const initGlobal = () => {
  window.MyPoetryApp = { mount }
  console.log('[Widget] Inizializzato:', window.MyPoetryApp)
}

// Verifica contesto browser (evita errori SSR)
if (typeof window !== 'undefined') {
  initGlobal()
}

// Cleanup per hot-reloading
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const roots = document.querySelectorAll('#root')
    roots.forEach(el => el?.unmount?.())
  })
}
