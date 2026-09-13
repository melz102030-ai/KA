import { useState } from "react";
import { Alert, View } from "react-native";
import { router, type Href } from "expo-router";
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
import { usePrefs } from "@/lib/prefs";
import { EditableAvatar } from "@/components/AvatarPicker";
import { fmtDateParts, type CalendarPref } from "@/lib/time";
import { seedDemoSchool } from "@/data/mutations";
import { useMemberships, useSchoolJoinCode } from "@/data/hooks";
import { space } from "@/theme";

const CALENDARS: { id: CalendarPref; label: string }[] = [
  { id: "hijri", label: "هجري" },
  { id: "gregorian", label: "ميلادي" },
  { id: "both", label: "كلاهما" },
];

type Tool = { icon: IconName; label: string; sub: string; href?: Href };

const TOOLS: Tool[] = [
  {
    icon: "notifications-outline",
    label: "التنبيهات",
    sub: "استغاثات، بطارية، سياج جغرافي",
    href: "/tools/alerts",
  },
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
  const { profile, signOut, isDemo } = useAuth();
  const { prefs, setCalendar } = usePrefs();
  const calendarPreview = fmtDateParts(new Date(), prefs.calendar);
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingVertical: space.md,
        }}
      >
        <EditableAvatar subjectId={profile?.uid ?? "me"} name={profile?.displayName} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{profile?.displayName ?? "المزيد"}</AppText>
          <AppText variant="label">اضغط الصورة لتغييرها</AppText>
        </View>
      </View>

      <SectionHeader>التقويم</SectionHeader>
      <Card padding={space.sm}>
        <View style={{ flexDirection: "row", gap: space.xs }}>
          {CALENDARS.map((c) => (
            <Button
              key={c.id}
              label={c.label}
              size="sm"
              variant={prefs.calendar === c.id ? "primary" : "ghost"}
              onPress={() => setCalendar(c.id)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        {/* Live preview, so the choice is obvious before leaving the screen. */}
        <View style={{ alignItems: "center", marginTop: space.sm, gap: 2 }}>
          <AppText variant="label">{calendarPreview.primary}</AppText>
          {calendarPreview.secondary && (
            <AppText variant="caption">{calendarPreview.secondary}</AppText>
          )}
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
