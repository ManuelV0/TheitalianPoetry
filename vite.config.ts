import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'), // Punto di ingresso
      name: 'MyPoetryApp', // Nome globale per IIFE
      formats: ['iife'],   // Uscita come IIFE (self-executing for browser/widget)
      fileName: () => 'my-poetry-app.iife.js', // Nome file finale
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        }
      },
      external: ['react', 'react-dom'],
    },
    minify: 'terser',
    emptyOutDir: true,
  }
});
