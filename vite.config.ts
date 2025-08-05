import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.platform': JSON.stringify('browser'),
    global: 'window'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
        'react-router-dom',
        '@supabase/supabase-js'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM'
        },
        inlineDynamicImports: true,
        extend: true,
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 2000
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['js-big-decimal'],
    esbuildOptions: {
      target: 'es2015'
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true
  }
})
