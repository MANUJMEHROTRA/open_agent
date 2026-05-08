/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce7ff',
          200: '#b5caff',
          300: '#7da3ff',
          400: '#4a72ff',
          500: '#2048ff',
          600: '#1030f5',
          700: '#0e24e1',
          800: '#1020b4',
          900: '#13218e',
        },
      },
    },
  },
  plugins: [],
}
