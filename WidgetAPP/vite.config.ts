// vite.config.js
export default {
  build: {
    lib: {
      formats: ['iife'], // Solo IIFE
      name: 'MyPoetryApp', // Case-sensitive
      entry: 'src/index.tsx',
      fileName: 'my-poetry-app' // Nome fisso
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // Supabase incluso
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
}
