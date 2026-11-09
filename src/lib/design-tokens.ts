/**
 * Centralized Design Tokens for the Finlab-inspired Fintech Platform
 */
export const DESIGN_TOKENS = {
  colors: {
    pageBg: "#07090E",
    cardBg: "rgba(255, 255, 255, 0.04)",
    headerNavy: "#07090E",
    headerNavySurface: "#0E121B",
    headerNavyBorder: "rgba(255, 255, 255, 0.08)",
    primaryTeal: "#0071E3",
    primaryTealHover: "#0077ED",
    primaryTealSubtle: "rgba(0, 113, 227, 0.15)",
    textMain: "#F5F5F7",
    textMuted: "#86868B",
    textInverse: "#07090E",
    textInverseMuted: "#636366",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    borderHeader: "rgba(255, 255, 255, 0.08)",
    positive: "#30D158",
    negative: "#FF453A",
    warning: "#FF9F0A",
    info: "#2997FF",
  },
  radius: {
    card: "20px",
    button: "980px",
    badge: "980px",
  },
  typography: {
    fontSans:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
  },
  defaults: {
    currency: "USD",
    locale: "es-PA",
    timeZone: "America/Panama",
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
