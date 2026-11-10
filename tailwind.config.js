/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { navy: '#102b3f', teal: '#137f78', mint: '#e6f4f0', sand: '#f7f4ed', ink: '#183247' }, fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] }, boxShadow: { soft: '0 12px 40px rgba(16, 43, 63, .08)' } } },
  plugins: [require('@tailwindcss/forms')],
}