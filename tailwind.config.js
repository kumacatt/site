/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Keleti', 'Gropled-Bold', 'Inter', 'sans-serif'],
        sans: ['Gropled-Bold', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Anonymous Pro"', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
