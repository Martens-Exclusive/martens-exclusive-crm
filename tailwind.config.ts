import type { Config } from "tailwindcss";

// Kleuren die van dag naar nacht wisselen staan als CSS-variabelen in app/globals.css.
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Vervangen de vaste zwart/wit: tekst, randen en vlakken draaien mee in nachtmodus.
        black: themed("c-black"),
        white: themed("c-white"),
        page: themed("page"),
        header: themed("header"),
        card: themed("card"),
        panel: themed("panel"),
        raised: themed("raised"),
        soft: themed("soft"),
        hover: themed("hover"),
        hover2: themed("hover2"),
        hover3: themed("hover3"),
        brand: {
          black: "#000000",
          charcoal: "#1a1a1a",
          steel: "#2a2a2a",
          silver: "#c0c0c0",
          white: "#ffffff"
        }
      },
      // Dunne scheidingslijnen (border-black/8, /12) bestonden niet in de standaardschaal.
      opacity: { 8: "0.08", 12: "0.12" },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
