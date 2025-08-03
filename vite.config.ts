import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.platform': JSON.stringify('browser'),
    global: 'window' // Aggiunto per compatibilità
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // Aggiunto per evitare warning
        inlineDynamicImports: true,
        extend: true
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015' // Compatibilità con browser più vecchi
  }
})
