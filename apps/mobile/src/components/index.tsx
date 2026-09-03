import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { alpha, color, font, radius, shadow, space } from "@/theme";
import { Icon, type IconName } from "./Icon";

export { Icon, type IconName } from "./Icon";

/* ── Text ──────────────────────────────────────────────────────────────── */

type TextVariant = "title" | "heading" | "subtitle" | "body" | "label" | "caption" | "mono";

const TEXT: Record<TextVariant, TextStyle> = {
  title: {
    fontFamily: font.family.black,
    fontSize: font.size.xl,
    color: color.text,
    lineHeight: 30,
  },
  heading: {
    fontFamily: font.family.bold,
    fontSize: font.size.lg,
    color: color.text,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: font.family.bold,
    fontSize: font.size.md,
    color: color.text,
    lineHeight: 22,
  },
  body: {
    fontFamily: font.family.regular,
    fontSize: font.size.md,
    color: color.text,
    lineHeight: 22,
  },
  label: {
    fontFamily: font.family.regular,
    fontSize: font.size.sm,
    color: color.textMuted,
    lineHeight: 20,
  },
  caption: {
    fontFamily: font.family.medium,
    fontSize: font.size.xs,
    color: color.textDim,
    lineHeight: 16,
  },
  mono: { fontFamily: font.family.mono, fontSize: font.size.md, color: color.text },
};

export function AppText({
  variant = "body",
  color: c,
  weight,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  weight?: "regular" | "medium" | "bold" | "black";
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        TEXT[variant],
        c ? { color: c } : null,
        weight ? { fontFamily: font.family[weight] } : null,
        style,
      ]}
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
  const pad = padded ? { paddingHorizontal: space.lg } : null;
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingTop: space.md, paddingBottom: space.xxxl * 2 }, pad]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: space.md }, pad]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  onPress,
  style,
  padding = space.lg,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const base = [styles.card, { padding }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && { backgroundColor: color.surfaceAlt }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

/* ── Button ────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  fullWidth,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const heights = { sm: 36, md: 46, lg: 54 };
  const fg =
    variant === "primary"
      ? color.onPrimary
      : variant === "danger"
        ? color.danger
        : variant === "ghost"
          ? color.primary
          : color.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          height: heights[size],
          paddingHorizontal: size === "sm" ? space.md : space.lg,
          backgroundColor:
            variant === "primary"
              ? disabled
                ? color.borderStrong
                : color.primary
              : variant === "secondary"
                ? color.surface
                : "transparent",
          borderWidth: variant === "secondary" || variant === "danger" ? 1 : 0,
          borderColor: variant === "danger" ? alpha(color.danger, 0.4) : color.border,
          opacity: pressed ? 0.9 : 1,
          alignSelf: fullWidth ? "stretch" : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          {icon && (
            <Icon
              name={icon}
              size={size === "sm" ? 15 : 18}
              color={disabled ? color.textDim : fg}
            />
          )}
          <Text
            style={{
              fontFamily: font.family.bold,
              fontSize: size === "sm" ? font.size.sm : font.size.md,
              color:
                disabled && variant === "primary" ? color.surface : disabled ? color.textDim : fg,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* ── ListRow (the standard settings-style row) ─────────────────────────── */

export function ListRow({
  icon,
  iconColor = color.primary,
  title,
  subtitle,
  value,
  onPress,
  chevron = true,
  danger,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
}) {
  const body = (
    <View style={styles.row}>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: alpha(iconColor, 0.1) }]}>
          <Icon name={icon} size={18} color={danger ? color.danger : iconColor} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle" color={danger ? color.danger : color.text}>
          {title}
        </AppText>
        {subtitle && <AppText variant="label">{subtitle}</AppText>}
      </View>
      {value && <AppText variant="label">{value}</AppText>}
      {onPress && chevron && <Icon name="chevron-back" size={18} color={color.textDim} />}
    </View>
  );
  if (!onPress) return <View style={styles.rowWrap}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowWrap, pressed && { backgroundColor: color.surfaceAlt }]}
    >
      {body}
    </Pressable>
  );
}

/** Groups ListRows into a single bordered card with dividers. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.rowGroup}>{children}</View>;
}

/* ── Field ─────────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  style,
  ...input
}: TextInputProps & { label?: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      {label && <AppText variant="label">{label}</AppText>}
      <TextInput
        placeholderTextColor={color.textDim}
        {...input}
        style={[styles.field, error ? { borderColor: color.danger } : null, style]}
      />
      {error ? (
        <AppText variant="caption" color={color.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
const TONE: Record<Tone, { fg: string; bg: string }> = {
  primary: { fg: color.primary, bg: color.primarySoft },
  success: { fg: color.success, bg: color.successSoft },
  warning: { fg: color.warning, bg: color.warningSoft },
  danger: { fg: color.danger, bg: color.dangerSoft },
  info: { fg: color.info, bg: color.infoSoft },
  neutral: { fg: color.textMuted, bg: color.bg },
};

export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
}) {
  const t = TONE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Icon name={icon} size={12} color={t.fg} />}
      <Text style={{ color: t.fg, fontSize: font.size.xs, fontFamily: font.family.bold }}>
        {label}
      </Text>
    </View>
  );
}

export function Dot({ tone = "success", size = 8 }: { tone?: Tone; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: TONE[tone].fg }}
    />
  );
}

export function Avatar({
  name,
  size = 40,
  tone = "primary",
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const t = TONE[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.fg, fontFamily: font.family.bold, fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  height = 6,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View
      style={{ height, borderRadius: height, backgroundColor: color.border, overflow: "hidden" }}
    >
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: TONE[tone].fg }} />
    </View>
  );
}

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={{
          fontFamily: font.family.bold,
          fontSize: font.size.xs,
          color: color.textMuted,
          letterSpacing: 0.5,
        }}
      >
        {children}
      </Text>
      {action}
    </View>
  );
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  tone?: Tone;
}) {
  return (
    <View style={styles.statCard}>
      {icon && <Icon name={icon} size={16} color={TONE[tone].fg} />}
      <Text style={{ fontFamily: font.family.black, fontSize: font.size.xl, color: color.text }}>
        {value}
        {unit ? (
          <Text style={{ fontSize: font.size.sm, color: color.textMuted }}> {unit}</Text>
        ) : null}
      </Text>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: color.border }} />;
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxxl, gap: space.sm }}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={color.textDim} />
      </View>
      <AppText variant="subtitle">{title}</AppText>
      {subtitle && (
        <AppText variant="label" style={{ textAlign: "center" }}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

/* ── styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  card: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  btn: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowGroup: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    backgroundColor: color.surface,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: color.text,
    fontFamily: font.family.regular,
    fontSize: font.size.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
  },
});
