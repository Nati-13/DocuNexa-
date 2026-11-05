import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          fg: "rgb(var(--brand-fg) / <alpha-value>)",
          50: "rgb(var(--paper) / <alpha-value>)",
          100: "rgb(var(--border) / <alpha-value>)",
          200: "rgb(var(--border) / <alpha-value>)",
          300: "rgb(var(--muted) / <alpha-value>)",
          400: "rgb(var(--brand) / <alpha-value>)",
          500: "rgb(var(--brand) / <alpha-value>)",
          600: "rgb(var(--brand) / <alpha-value>)",
          700: "rgb(var(--brand) / <alpha-value>)",
          800: "rgb(var(--ink) / <alpha-value>)",
          900: "rgb(var(--ink) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          fg: "rgb(var(--accent-fg) / <alpha-value>)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif-display)", "Nyala", "'Abyssinica SIL'", "Kefa", "serif"],
        heading: ["var(--font-serif-display)", "Nyala", "'Abyssinica SIL'", "Kefa", "serif"],
        sans: ["var(--font-sans)", "Nyala", "Kefa", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "8px",
        "2xl": "8px",
        "3xl": "8px",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
