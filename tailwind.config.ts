import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sarthi brand palette
        forest: {
          50: "#F1F7F2",
          100: "#DCEBE0",
          200: "#B9D6C1",
          300: "#8FBA9C",
          400: "#5F9974",
          500: "#3F7C57",
          600: "#2F6244",
          700: "#264E37",
          800: "#1A3E2C",
          900: "#14422D",
          950: "#0D2B1D", // primary dark hero / footer
        },
        cream: "#FAFAF7",
        saffron: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          400: "#FB923C",
          500: "#F97316", // saffron accent
          600: "#EA580C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(17,24,39,0.06), 0 1px 2px rgba(17,24,39,0.04)",
        "card-hover":
          "0 12px 24px -8px rgba(17,24,39,0.12), 0 4px 8px rgba(17,24,39,0.06)",
        chat: "0 24px 48px -12px rgba(13, 43, 29, 0.25)",
      },
      animation: {
        "slide-in-right": "slide-in-right 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-right": "slide-out-right 0.24s cubic-bezier(0.4, 0, 1, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "bounce-dot": "bounce-dot 1.4s ease-in-out infinite",
        "compass-spin": "compass-spin 2.4s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0.5)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        "compass-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
