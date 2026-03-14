/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        giet: {
          navy: '#272A6F',
          gold: '#EFBE33',
        }
      },
    },
  },
  plugins: [],
}
