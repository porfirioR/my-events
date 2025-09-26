/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/**/*.html",
    "./src/**/*.ts",
    "./projects/**/*.{html,ts}",
    "./node_modules/daisyui/dist/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: [
      "light",
      "dark",
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}