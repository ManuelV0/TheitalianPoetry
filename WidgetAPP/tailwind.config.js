module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './netlify/functions/**/*.{js,ts}',
    './public/index.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif']
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')
  ]
}
