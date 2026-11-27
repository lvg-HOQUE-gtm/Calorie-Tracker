/**
 * Ahaar AI design tokens — fresh organic lime/leaf green aesthetic inspired by FitBite.
 *
 * Clean white canvas with fresh light-lime tint (#84CC16 / #65A30D),
 * soft olive/sage card backgrounds, vibrant green scanner button,
 * and clean typography.
 */

export const colors = {
  // Backgrounds
  background: "#F7F9F6",
  backgroundAlt: "#EFF4EC",
  backgroundElevated: "#FFFFFF",

  // Surfaces
  surface: "#FFFFFF",
  surfaceAlt: "#F2F6EF",
  surfaceMuted: "#E5EBE1",

  // Signature Lime Green & Card Tints
  primaryGreen: "#84CC16", // Vibrant Fresh Lime Green
  primaryGreenDark: "#65A30D",
  primaryGreenLight: "#A3E635",
  greenHeroCard: "#E2F4D5", // Soft sage/lime green card background
  greenHeroCardBorder: "#CFECC0",
  greenSoft: "#ECF8E5",
  greenSoftBorder: "#D7F0C7",

  // Borders
  border: "#E2E8DE",
  borderSubtle: "#ECF2E8",
  borderStrong: "#CBD5C5",

  // Typography
  textPrimary: "#11190C",
  textSecondary: "#45543D",
  textMuted: "#87987E",
  textLight: "#FFFFFF",

  // Brand & Action Accents
  accent: "#84CC16", // Primary action green
  accentDark: "#11190C", // Dark accent for high contrast buttons
  accentMuted: "#4D7C0F",
  accentSoft: "#ECF8E5",

  // Scanner / Viewfinder Highlights
  scannerGreen: "#84CC16",
  scannerGlow: "rgba(132, 204, 22, 0.35)",

  // Flame / Streak / Highlights
  flame: "#F97316",
  flameSoft: "#FFF7ED",
  flameBorder: "#FFEDD5",

  // Macros
  protein: "#EF4444",
  proteinSoft: "#FEF2F2",
  proteinTrack: "#FEE2E2",

  carbs: "#F59E0B",
  carbsSoft: "#FFFBEB",
  carbsTrack: "#FEF3C7",

  fat: "#0EA5E9",
  fatSoft: "#E0F2FE",
  fatTrack: "#BAE6FD",

  fiber: "#84CC16",
  fiberSoft: "#ECF8E5",
  fiberTrack: "#D7F0C7",

  // Feedback states
  success: "#84CC16",
  successSoft: "#ECF8E5",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  warning: "#F59E0B",

  // Overlays & Base
  overlay: "rgba(17, 25, 12, 0.52)",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const radii = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  xxl: 36,
  pill: 999,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: "800" as const, letterSpacing: -0.8 },
  heroMetric: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  captionStrong: { fontSize: 13, fontWeight: "700" as const },
  tiny: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.3 },
} as const;

export const shadow = {
  card: {
    shadowColor: "#2F4F19",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: "#2F4F19",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  scannerBtn: {
    shadowColor: "#84CC16",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

export const theme = { colors, radii, spacing, typography, shadow } as const;

export type Theme = typeof theme;
