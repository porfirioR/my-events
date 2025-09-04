/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'fruit-salad': {
          '50': '#f1f8f2',
          '100': '#deedde',
          '200': '#bedcbf',
          '300': '#93c298',
          '400': '#57915f',
          '500': '#448550',
          '600': '#316a3c',
          '700': '#275531',
          '800': '#214429',
          '900': '#1c3823',
          '950': '#0f1f13',
        }
      }
    },
  },
  plugins: [require("daisyui")],
}