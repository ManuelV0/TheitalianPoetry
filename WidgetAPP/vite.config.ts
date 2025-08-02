export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPoetryApp',          // Il nome globale esposto (must match window.MyPoetryApp)
      fileName: (format) => `my-poetry-app.${format}.js`,
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@supabase/supabase-js'], // esclude queste da bundle
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@supabase/supabase-js': 'Supabase'
        }
      }
    }
  }
})
