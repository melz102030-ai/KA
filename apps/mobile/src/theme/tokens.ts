/**
 * Design tokens — one restrained, institutional visual language.
 * Light surface, a single primary accent, hairline borders, weight-driven
 * hierarchy. No decorative colour, no glow.
 */

export const color = {
  // brand
  primary: "#0E7A5F",
  primaryDark: "#0A5F49",
  primarySoft: "#E7F2EF",

  // surfaces
  bg: "#F4F6F8",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFBFC",
  overlay: "rgba(16,21,27,0.45)",

  // lines
  border: "#E5E8EC",
  borderStrong: "#D3D8DF",

  // text
  text: "#10151B",
  textMuted: "#5A6472",
  textDim: "#98A1AD",
  onPrimary: "#FFFFFF",

  // status (used only for real status, never decoration)
  success: "#1E8E4E",
  successSoft: "#E7F4EC",
  warning: "#A66300",
  warningSoft: "#FAF0DE",
  danger: "#C0362C",
  dangerSoft: "#FBEAE8",
  info: "#1B6EC2",
  infoSoft: "#E8F0FA",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 20, pill: 999 } as const;

export const font = {
  family: {
    regular: "Tajawal_400Regular",
    medium: "Tajawal_500Medium",
    bold: "Tajawal_700Bold",
    black: "Tajawal_900Black",
    mono: "SpaceMono_400Regular",
  },
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 },
} as const;

export const shadow = {
  card: {
    shadowColor: "#0B1F2A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: "#0B1F2A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

/** hex + 0..1 alpha -> "#rrggbbaa" */
export function alpha(hex: string, a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}
