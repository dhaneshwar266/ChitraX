import { Platform } from "react-native";

export const Colors = {
  dark: {
    // Backgrounds - Ultra-Premium Inky Obsidian & Velvet Slate
    background: "#08090C",
    surface: "#10131A",
    surfaceElevated: "#171B26",
    backgroundElement: "#171B26",
    backgroundSelected: "#202637",
    surfaceBorder: "rgba(243, 198, 79, 0.14)",
    surfaceCard: "#12151F",
    surfaceCardHover: "#1A1F2C",

    // Typography - Pure Crisp & Refined
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    // Primary Accents (Champagne & Regal Gold)
    primary: "#D4AF37",
    primaryLight: "#F3C64F",
    primaryGlow: "rgba(243, 198, 79, 0.18)",

    // Secondary Accent (Champagne Gold)
    accent: "#F3C64F",
    accentLight: "#FDE68A",

    // Controls and Dividers
    inactiveControl: "rgba(248, 250, 252, 0.60)",
    divider: "rgba(248, 250, 252, 0.08)",
    subtleGoldBorder: "rgba(243, 198, 79, 0.14)",

    // States
    danger: "#EF4444",
    dangerBg: "rgba(239, 68, 68, 0.15)",
    success: "#10B981",
    warning: "#F59E0B",

    // Player Overlays
    playerOverlay: "rgba(8, 9, 12, 0.90)",
    playerOverlayBorder: "rgba(243, 198, 79, 0.20)",
    backdrop: "rgba(0, 0, 0, 0.80)",
  },
  light: {
    // Backgrounds - Crisp Clean & Gold
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceElevated: "#F1F5F9",
    backgroundElement: "#F1F5F9",
    backgroundSelected: "#E2E8F0",
    surfaceBorder: "rgba(180, 140, 30, 0.16)",
    surfaceCard: "#FFFFFF",
    surfaceCardHover: "#F8FAFC",

    // Typography
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",

    // Primary Accents (Warm Antique Gold)
    primary: "#B8860B",
    primaryLight: "#D4AF37",
    primaryGlow: "rgba(184, 134, 11, 0.15)",

    // Secondary Accent
    accent: "#D4AF37",
    accentLight: "#F3C64F",

    // Controls and Dividers
    inactiveControl: "rgba(15, 23, 42, 0.60)",
    divider: "rgba(15, 23, 42, 0.08)",
    subtleGoldBorder: "rgba(180, 140, 30, 0.16)",

    // States
    danger: "#EF4444",
    dangerBg: "rgba(239, 68, 68, 0.1)",
    success: "#10B981",
    warning: "#F59E0B",

    // Player Overlays
    playerOverlay: "rgba(8, 9, 12, 0.90)",
    playerOverlayBorder: "rgba(243, 198, 79, 0.20)",
    backdrop: "rgba(0, 0, 0, 0.5)",
  },
} as const;

export type ThemeColors = typeof Colors.dark;
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
