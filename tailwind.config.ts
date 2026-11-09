import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          black: "#000000",             // Absolute Black
          paleGray: "#f5f5f7",          // Pale Apple Gray
          ink: "#1d1d1f",               // Near Black Ink
          actionBlue: "#0071e3",        // Apple Action Blue
          linkBlue: "#0066cc",          // Body Link Blue
          luminanceBlue: "#2997ff",     // High Luminance Link Blue
          canvas: "#ffffff",            // Pure White Canvas
          graphiteA: "#272729",         // Graphite Surface A
          graphiteB: "#262629",         // Graphite Surface B
          graphiteC: "#28282b",         // Graphite Surface C
          graphiteD: "#2a2a2c",         // Graphite Surface D
          neutralGray: "#6e6e73",       // Secondary Neutral Gray
          borderSoft: "#e8e8ed",        // Border Soft
          borderMid: "#d2d2d7",         // Soft Border Gray
          borderGray: "#86868b",        // Mid Border Gray
          green: "#30D158",             // Apple Success Mint
          red: "#FF453A",               // Apple Danger Coral
          orange: "#FF9F0A",            // Apple Warning Amber
          purple: "#BF5AF2",            // Apple Intelligence
        },
        finlab: {
          bg: "var(--color-bg)",
          navy: "var(--color-fg)",
          navySurface: "var(--color-surface)",
          navyBorder: "var(--color-border)",
          teal: "#0071e3",
          tealHover: "#0077ed",
          tealSubtle: "rgba(0, 113, 227, 0.15)",
          text: "var(--color-fg)",
          textMuted: "var(--color-fg-muted)",
          card: "var(--color-surface)",
          border: "var(--color-border)",
          borderSubtle: "var(--color-border)",
          positive: "#30D158",
          negative: "#FF453A",
          warning: "#FF9F0A",
          info: "#2997FF",
        },
      },
      borderRadius: {
        card: "20px",
        pill: "980px",
        squircle: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        cardHover: "0 16px 36px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
        header: "0 4px 30px rgba(0, 0, 0, 0.5)",
        glass: "0 12px 32px 0 rgba(0, 0, 0, 0.45)",
        appleGlow: "0 0 30px rgba(0, 113, 227, 0.25)",
        appleGlass: "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 12px 32px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        sans: [
          "var(--font-dm-sans)",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-dm-sans)",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
