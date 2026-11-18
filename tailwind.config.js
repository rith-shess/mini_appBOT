/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a8f8',
          500: '#0e8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b85',
          900: '#0c3f6e',
          950: '#082849',
        },
        navy: {
          50: '#f4f6fa',
          100: '#e8edf5',
          200: '#cbd7ea',
          300: '#9fb7d9',
          400: '#6d92c3',
          500: '#4b73aa',
          600: '#395a8c',
          700: '#2f4973',
          800: '#1b2b48',
          900: '#0f172a',
          950: '#080d19',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Kantumruy Pro"',
          'sans-serif',
        ],
      },
      boxShadow: {
        'subtle': '0 2px 8px -1px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)',
        'card': '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        'floating': '0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 4px 10px -3px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
};
