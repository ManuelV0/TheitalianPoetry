import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // target moderno, se vuoi compatibilità maggiore usa "es2017" ecc.
    target: 'esnext',
  },
  // se usi Netlify Edge functions o simili, configura qui eventuali base/publicDir
});
