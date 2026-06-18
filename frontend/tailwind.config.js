/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bob: {
          orange: '#F05A28', // Bank of Baroda Official Orange
          blue: '#0A3161',   // Bank of Baroda Official Dark Blue
          lightBlue: '#1e4b85'
        },
        cyber: {
          bg: '#060913',
          card: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(51, 65, 85, 0.5)',
          glow: '#00f0ff', // Neon Security Cyan
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.25)',
        'glow-rose': '0 0 15px rgba(244, 63, 94, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
