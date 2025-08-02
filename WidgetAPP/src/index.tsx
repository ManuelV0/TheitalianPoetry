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

export { mount }
