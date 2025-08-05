import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.platform': JSON.stringify('browser'),
    global: 'window'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Aggiungi alias per react-router-dom se necessario
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'MyPoetryApp',
      fileName: (format) => `my-poetry-app.${format}.js`,
      formats: ['iife'],
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom',
        'react-router-dom', // Aggiunto per risolvere l'errore
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM' // Aggiunto
        },
        inlineDynamicImports: true,
        extend: true
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    // Aggiunto per ottimizzare la build
    minify: 'terser',
    sourcemap: true,
    chunkSizeWarningLimit: 1600
  },
  // Aggiunto per ottimizzare le dipendenze
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['js-big-decimal']
  }
})
