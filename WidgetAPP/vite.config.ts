
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env': env
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components')
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/index.tsx'),
        name: 'MyPoetryApp',
        fileName: (format) => `my-poetry-app.${format}.js`,
        formats: ['iife']
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          },
          footer: 'window.MyPoetryApp = { mount: default };'
        }
      }
    },
    server: {
      port: 3000,
      open: true
    }
  }
})
