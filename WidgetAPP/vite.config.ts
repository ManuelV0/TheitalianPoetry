import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',
      fileName: (format) => `my-poetry-app.${format}.js`,
      formats: ['iife'] // self-executing bundle per uso diretto via <script>
    },
    rollupOptions: {
      // Esternalizza le dipendenze che caricherai tramite CDN nel sito principale
      external: ['react', 'react-dom', '@supabase/supabase-js'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@supabase/supabase-js': 'Supabase'
        }
      }
    }
  }
})
