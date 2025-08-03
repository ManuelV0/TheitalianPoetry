import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const mount = (el: HTMLElement) => {
  const root = ReactDOM.createRoot(el)
  root.render(<App />)
  return () => root.unmount()
}

if (process.env.NODE_ENV === 'development') {
  const devRoot = document.getElementById('root')
  if (devRoot) mount(devRoot)
}

// Questa riga è cruciale!
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.MyPoetryApp = { mount }
  console.log("Widget caricato, window.MyPoetryApp:", window.MyPoetryApp)
}

// NON esportare nulla qui sotto!
// export { mount }  // <-- TOGLI questa riga
