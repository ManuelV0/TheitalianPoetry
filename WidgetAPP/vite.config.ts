import { defineConfig } from 'vite'  // Assicurati che questo import sia presente
import react from '@vitejs/plugin-react'

// Verifica che questa riga sia presente
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',
      fileName: 'my-poetry-app',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
