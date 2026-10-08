/** @type {import('tailwindcss').Config} */
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  spacing,
} from "./src/theme/tokens.js";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
      spacing,
      borderRadius,
    },
  },
  plugins: [],
};
