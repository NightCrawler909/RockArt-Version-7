/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Space Mono"', 'sans-serif'],
      },
      colors: {
        night: {
          900: "#04050d",
          800: "#070a16",
        },
      },
      boxShadow: {
        brand: "0 20px 35px rgba(16, 221, 199, 0.15)",
      },
    },
  },
  plugins: [],
};
