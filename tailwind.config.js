/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        "primary": "#065144",
        "bronze": "#A37D4B",
        "sand": "#C9B7A2",
        "taupe": "#3D342D",
        "luxury-cream": "#FDFCF8",
        "background-dark": "#10221f",
        stone: {
          50: '#FDFCF8',
          100: '#F5F2EA',
          200: '#E7E2D8',
          300: '#D9D3C5',
          400: '#A89E8D',
          500: '#786F60',
          600: '#574F44',
          700: '#443D34',
          800: '#29241E',
          900: '#1C1914',
        },
        luxury: {
          emerald: '#064E3B',
          bronze: '#A37D4B',
          gold: '#C5A059',
          cream: '#FDFCF8',
          taupe: '#D9B0C1',
        }
      },
    },
  },
  plugins: [],
}
