import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',           // << NOME DELLA GLOBALE
      fileName: 'my-poetry-app.js',  // << NOME FISSO, niente hash/format
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // Supabase viene INCLUSO nel bundle!
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
