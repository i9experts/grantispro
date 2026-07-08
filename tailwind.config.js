/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: "#3B1F3A", deep: "#2A1428" },
        emerald: { DEFAULT: "#1FAA7C", dark: "#0E7A57" },
        marigold: { DEFAULT: "#F4A623", dark: "#D6870C" },
        ivory: { DEFAULT: "#FBF7F0", dim: "#F1E9DA" },
      },
      fontFamily: {
        display: ["var(--font-unbounded)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(59,31,58,0.04), 0 1px 8px rgba(59,31,58,0.03)",
      },
    },
  },
  plugins: [],
};
