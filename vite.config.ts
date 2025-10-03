import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        'react-icons/fa',
        'react-icons',
        /^react-icons\/.*/
      ]
    }
  },
  optimizeDeps: {
    exclude: ['react-icons']
  }
});
