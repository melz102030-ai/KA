import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { alpha, color, font, radius, space } from "@/theme";

/* ── Text ──────────────────────────────────────────────────────────────── */

type TextVariant = "display" | "title" | "heading" | "body" | "label" | "mono";
const TEXT_STYLES: Record<TextVariant, TextStyle> = {
  display: { fontFamily: font.family.sansBlack, fontSize: font.size.display, color: color.text },
  title: { fontFamily: font.family.sansBlack, fontSize: font.size.xxl, color: color.text },
  heading: { fontFamily: font.family.sansBold, fontSize: font.size.lg, color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.md, color: color.text },
  label: { fontFamily: font.family.sans, fontSize: font.size.sm, color: color.textMuted },
  mono: { fontFamily: font.family.mono, fontSize: font.size.md, color: color.text },
};

export function AppText({
  variant = "body",
  color: c,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[TEXT_STYLES[variant], c ? { color: c } : null, style]}
    >
      {children}
    </Text>
  );
}

/* ── Screen ────────────────────────────────────────────────────────────── */

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const inner = (
    <View style={[styles.screenInner, padded && { paddingHorizontal: space.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxl * 3 }}
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  accent,
  glow,
  style,
}: {
  children: ReactNode;
  accent?: string;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.card,
        accent ? { backgroundColor: alpha(accent, 0.09), borderColor: alpha(accent, 0.25) } : null,
        glow && accent ? { shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 16 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Button ────────────────────────────────────────────────────────────── */

export function Button({
  label,
  onPress,
  accent = color.teal,
  variant = "solid",
  size = "md",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  accent?: string;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const solid = variant === "solid";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        size === "sm" && { paddingVertical: space.sm, paddingHorizontal: space.md },
        {
          backgroundColor: disabled
            ? color.surfaceStrong
            : solid
              ? accent
              : variant === "outline"
                ? alpha(accent, 0.12)
                : "transparent",
          borderColor: variant === "outline" ? alpha(accent, 0.4) : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? "#fff" : accent} />
      ) : (
        <Text
          style={{
            fontFamily: font.family.sansBold,
            fontSize: size === "sm" ? font.size.sm : font.size.md,
            color: disabled ? color.textDim : solid ? "#fff" : accent,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

export function Dot({ color: c = color.green, size = 8 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c }} />;
}

export function Avatar({
  emoji,
  size = 44,
  accent = color.teal,
}: {
  emoji: string;
  size?: number;
  accent?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: alpha(accent, 0.18),
        borderWidth: 2,
        borderColor: alpha(accent, 0.3),
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  accent = color.teal,
  height = 6,
}: {
  value: number;
  max?: number;
  accent?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: color.surfaceStrong,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: accent,
          borderRadius: height,
        }}
      />
    </View>
  );
}

export function Pill({ label, accent = color.teal }: { label: string; accent?: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        backgroundColor: alpha(accent, 0.15),
        borderWidth: 1,
        borderColor: alpha(accent, 0.33),
      }}
    >
      <Text style={{ color: accent, fontSize: font.size.xs, fontFamily: font.family.sansBold }}>
        {label}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
      {children}
    </AppText>
  );
}

export function StatTile({
  label,
  value,
  unit,
  accent = color.teal,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Text
          style={{ color: color.textMuted, fontSize: font.size.xs, fontFamily: font.family.sans }}
        >
          {label}
        </Text>
        <Text style={{ color: accent, fontSize: font.size.sm, fontFamily: font.family.sansBold }}>
          {value}
          {unit ? <Text style={{ fontSize: font.size.xs }}>{unit}</Text> : null}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  screenInner: { paddingTop: space.md },
  card: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  stat: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    padding: space.sm,
  },
});
