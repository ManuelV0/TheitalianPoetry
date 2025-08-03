// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',
      formats: ['iife'],
      fileName: 'my-poetry-app'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // Garantisce l'esportazione globale
        footer: 'window.MyPoetryApp = { mount: default };'
      }
    }
  }
})
