import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env.NODE_ENV === 'production' 
      ? {
          NODE_ENV: '"production"',
          VITE_SUPABASE_URL: `"${process.env.VITE_SUPABASE_URL}"`,
          VITE_SUPABASE_ANON_KEY: `"${process.env.VITE_SUPABASE_ANON_KEY}"`
        } 
      : {
          NODE_ENV: '"development"'
        },
    global: {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: 'entries/[name].[hash].js'
      }
    },
    minify: 'terser',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  preview: {
    port: 4173,
    open: true
  }
})
