/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#fdf2f6',
          100: '#fce7ed',
          200: '#f9cfe0',
          300: '#f5a7c8',
          400: '#ee7aa3',
          500: '#eb5a7a',
          600: '#d63364',
          700: '#ae2754',
          800: '#903047',
          900: '#78283f',
        },
        red: {
          500: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
