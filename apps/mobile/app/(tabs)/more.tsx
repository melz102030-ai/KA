import { View } from "react-native";
import { router, type Href } from "expo-router";
import type { Role } from "@akbadna/core";
import { AppText, Button, Card, Screen, SectionTitle } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, radius, space } from "@/theme";

const ROLES: { id: Role; label: string; emoji: string }[] = [
  { id: "parent", label: "ولي أمر", emoji: "👨" },
  { id: "teacher", label: "معلم", emoji: "👨‍🏫" },
  { id: "student", label: "طالب", emoji: "👦" },
];

type Tool = { icon: string; label: string; sub: string; tint: string; href?: Href };

const TOOLS: Tool[] = [
  {
    icon: "🆔",
    label: "معرّف أكبادنا",
    sub: "ربط الساعة بأي شخص بالمعرّف",
    tint: color.purple,
    href: "/tools/akbid",
  },
  {
    icon: "📅",
    label: "جدول الحصص",
    sub: "عرض جدول اليوم كاملاً",
    tint: color.blue,
    href: "/tools/schedule",
  },
  {
    icon: "❤️",
    label: "الصحة والحيويات",
    sub: "نبض، حرارة، نشاط",
    tint: color.red,
    href: "/tools/health",
  },
  {
    icon: "💰",
    label: "المحفظة المدرسية",
    sub: "الرصيد، الشحن، السجل",
    tint: color.yellow,
    href: "/tools/wallet",
  },
  { icon: "🗺️", label: "تتبع الخروج", sub: "توجيه الطالب لموقع الانتظار", tint: color.teal },
  { icon: "🏫", label: "ربط نظام نور", sub: "جلب بيانات الطالب من الوزارة", tint: "#1A5276" },
  { icon: "📡", label: "اللوحة المباشرة", sub: "تتبع كل الساعات — للمدرسة", tint: color.purple },
];

export default function More() {
  const { profile, setActiveRole, signOut } = useAuth();
  const activeRole = profile?.activeRole ?? "parent";

  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.lg }}>
        ⋯ المزيد
      </AppText>

      <Card style={{ marginBottom: space.lg }}>
        <AppText variant="label" style={{ marginBottom: space.sm }}>
          وضع المستخدم
        </AppText>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {ROLES.map((r) => {
            const active = activeRole === r.id;
            return (
              <Button
                key={r.id}
                label={`${r.emoji} ${r.label}`}
                size="sm"
                accent={color.teal}
                variant={active ? "solid" : "outline"}
                onPress={() => void setActiveRole(r.id)}
                style={{ flex: 1 }}
              />
            );
          })}
        </View>
      </Card>

      <SectionTitle>الأدوات</SectionTitle>
      <View style={{ gap: space.sm }}>
        {TOOLS.map((t) => (
          <Card
            key={t.label}
            onPress={t.href ? () => router.push(t.href!) : undefined}
            style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(t.tint, 0.18),
              }}
            >
              <AppText style={{ fontSize: 22 }}>{t.icon}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t.label}</AppText>
              <AppText variant="label">{t.sub}</AppText>
            </View>
            <AppText variant="label" color={color.textDim}>
              {t.href ? "‹" : "قريبًا"}
            </AppText>
          </Card>
        ))}
      </View>

      <View style={{ alignItems: "center", marginVertical: space.xl }}>
        <AppText variant="heading">أكبادنا</AppText>
        <AppText variant="label">منصة التعليم الذكية — الإصدار 0.1</AppText>
      </View>

      <Button
        label="🚪 تسجيل الخروج"
        accent={color.red}
        variant="outline"
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        }}
      />
    </Screen>
  );
}
