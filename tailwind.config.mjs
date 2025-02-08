/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "neon-blue": "#5450FF",
        "neon-blue-darker": "#4340cc",
        "ygg-blue": "#68dec0",
        "imdb-yellow": "#F5C517",
      },
    },
  },
  plugins: [],
};
