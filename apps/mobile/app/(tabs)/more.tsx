import { useState } from "react";
import { Alert, View } from "react-native";
import { router, type Href } from "expo-router";
import type { Role } from "@akbadna/core";
import {
  AppText,
  Button,
  Card,
  type IconName,
  ListRow,
  RowGroup,
  Screen,
  SectionHeader,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { seedDemoSchool } from "@/data/mutations";
import { useMemberships, useSchoolJoinCode } from "@/data/hooks";
import { space } from "@/theme";

const ROLES: { id: Role; label: string }[] = [
  { id: "parent", label: "ولي أمر" },
  { id: "teacher", label: "معلم" },
  { id: "student", label: "طالب" },
];

type Tool = { icon: IconName; label: string; sub: string; href?: Href };

const TOOLS: Tool[] = [
  {
    icon: "watch-outline",
    label: "اقتران ساعة KT37",
    sub: "ربط ساعة جديدة بطفلك",
    href: "/tools/pair-watch",
  },
  {
    icon: "qr-code-outline",
    label: "معرّف أكبادنا",
    sub: "ربط الساعة بشخص موثوق",
    href: "/tools/akbid",
  },
  {
    icon: "calendar-outline",
    label: "جدول الحصص",
    sub: "جدول اليوم كاملًا",
    href: "/tools/schedule",
  },
  {
    icon: "walk-outline",
    label: "تتبع الخروج",
    sub: "توجيه الطالب لموقع الانتظار",
    href: "/tools/tracking",
  },
  {
    icon: "pulse-outline",
    label: "الصحة والحيويات",
    sub: "النبض والحرارة والنشاط",
    href: "/tools/health",
  },
  {
    icon: "card-outline",
    label: "المحفظة المدرسية",
    sub: "الرصيد والشحن والسجل",
    href: "/tools/wallet",
  },
  {
    icon: "business-outline",
    label: "ربط نظام نور",
    sub: "جلب بيانات الطالب الرسمية",
    href: "/tools/noor",
  },
  {
    icon: "analytics-outline",
    label: "اللوحة المباشرة",
    sub: "تتبع كل الساعات — للمدرسة",
    href: "/tools/receiver",
  },
];

export default function More() {
  const { profile, setActiveRole, signOut, isDemo } = useAuth();
  const activeRole = profile?.activeRole ?? "parent";
  const [seeding, setSeeding] = useState(false);
  const { data: memberships } = useMemberships();
  const school = memberships.find((m) => m.role === "teacher" || m.role === "school_admin");
  const joinCode = useSchoolJoinCode(school?.schoolId);

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await seedDemoSchool();
      Alert.alert("تم", `أُنشئت مدرسة وفصل و${res.kidIds.length} طلاب مرتبطين بحسابك.`);
    } catch (e) {
      Alert.alert("تعذّر", e instanceof Error ? e.message : "تأكد من تفعيل Firestore.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.md }}>
        المزيد
      </AppText>

      <SectionHeader>وضع المستخدم</SectionHeader>
      <Card padding={space.sm}>
        <View style={{ flexDirection: "row", gap: space.xs }}>
          {ROLES.map((r) => {
            const active = activeRole === r.id;
            return (
              <Button
                key={r.id}
                label={r.label}
                size="sm"
                variant={active ? "primary" : "ghost"}
                onPress={() => void setActiveRole(r.id)}
                style={{ flex: 1 }}
              />
            );
          })}
        </View>
      </Card>

      {joinCode && (
        <>
          <SectionHeader>رمز انضمام أولياء الأمور</SectionHeader>
          <Card
            onPress={() =>
              Alert.alert("رمز الانضمام", `${joinCode}\n\nشاركه مع أولياء أمور فصلك للانضمام.`)
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <AppText variant="mono" style={{ flex: 1, letterSpacing: 4, fontSize: 20 }}>
                {joinCode}
              </AppText>
              <AppText variant="label">نسخ / مشاركة</AppText>
            </View>
          </Card>
        </>
      )}

      <SectionHeader>الخدمات</SectionHeader>
      <RowGroup>
        {TOOLS.map((t) => (
          <ListRow
            key={t.label}
            icon={t.icon}
            title={t.label}
            subtitle={t.sub}
            onPress={t.href ? () => router.push(t.href!) : undefined}
          />
        ))}
      </RowGroup>

      {!isDemo && (
        <>
          <SectionHeader>الحساب</SectionHeader>
          <Button
            label="إنشاء بيانات تجريبية في Firestore"
            variant="secondary"
            icon="leaf-outline"
            loading={seeding}
            onPress={seed}
          />
        </>
      )}

      <View style={{ alignItems: "center", marginVertical: space.xxl }}>
        <AppText variant="caption">أكبادنا · الإصدار 0.1{isDemo ? " · وضع تجريبي" : ""}</AppText>
      </View>

      <Button
        label="تسجيل الخروج"
        variant="danger"
        icon="log-out-outline"
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        }}
      />
    </Screen>
  );
}
