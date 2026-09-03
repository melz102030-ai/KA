/** Design tokens — the single visual vocabulary for the app. */

export const palette = {
  teal: "#4ECDC4",
  tealDark: "#2BB5AB",
  blue: "#45B7D1",
  green: "#22C55E",
  greenDark: "#16A34A",
  yellow: "#F59E0B",
  red: "#EF4444",
  purple: "#A78BFA",
  pink: "#FF6B9D",
} as const;

export const color = {
  ...palette,
  bg: "#070711",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textMuted: "#8A8A99",
  textDim: "#4A4A57",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const font = {
  family: {
    sans: "Tajawal_400Regular",
    sansMedium: "Tajawal_500Medium",
    sansBold: "Tajawal_700Bold",
    sansBlack: "Tajawal_900Black",
    mono: "SpaceMono_400Regular",
  },
  size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, display: 44 },
} as const;

/** Hex + 0..1 alpha -> "#rrggbbaa". Accepts palette hex strings. */
export function alpha(hex: string, a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}
