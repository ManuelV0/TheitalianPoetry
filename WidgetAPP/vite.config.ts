export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',
      fileName: 'my-poetry-app',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
+       // Aggiungi questa sezione CRUCIALE
+       intro: 'const global = window;',
+       footer: () => `
+         if (typeof window !== 'undefined') {
+           window.MyPoetryApp = { mount: X };
+         }
+       `
      }
    }
  }
})
