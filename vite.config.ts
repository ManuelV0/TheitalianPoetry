import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),   // <-- il tuo entrypoint reale!
      name: 'MyPoetryApp',                               // l’oggetto globale che esporti su window
      formats: ['iife'],                                 // build come file standalone <script>
      fileName: () => 'my-poetry-app.iife.js',           // nome del bundle
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      },
      external: ['react', 'react-dom'],                  // NON includere React nel bundle, userà quello CDN (come il tuo HTML)
    },
    minify: 'terser',
    emptyOutDir: true,
  }
});
