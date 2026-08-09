// DSI 360 — Charte graphique AL_AMANA_TECH_SECURITE (navy / or)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef0f7',
          100: '#d4d9ea',
          300: '#8b96bd',
          500: '#3d4a85',
          700: '#1c2450',
          800: '#141a3a',
          900: '#0d0f21', // navy principal (charte validée)
        },
        gold: {
          300: '#e8cf7a',
          400: '#ddc05a',
          500: '#c9a227', // or principal (charte validée)
          600: '#a5831e',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(13, 15, 33, 0.08), 0 1px 2px rgba(13, 15, 33, 0.06)',
      },
    },
  },
  plugins: [],
}
