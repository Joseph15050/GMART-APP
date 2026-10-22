/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-dark': '#0f172a',
        'app-card': '#1e293b',
        'app-accent': '#10b981',
        'app-gold': '#f59e0b',
      }
    },
  },
  plugins: [],
}
