import { useEffect, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import type { Role } from "@akbadna/core";
import { AppText, Button, Card, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, font, radius, space } from "@/theme";

const ROLES: { id: Role; label: string; sub: string; emoji: string; accent: string }[] = [
  { id: "parent", label: "ولي الأمر", sub: "تابع أبناءك بأمان", emoji: "👨‍👩‍👧", accent: color.teal },
  { id: "teacher", label: "المعلم", sub: "إدارة الفصل والحضور", emoji: "👨‍🏫", accent: color.purple },
];

export default function SignIn() {
  const { signInDev, phoneAuthAvailable, authed } = useAuth();
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  // Navigate once a session exists (real or demo) — avoids a redirect race.
  useEffect(() => {
    if (authed) setBusy(false);
  }, [authed]);

  if (authed) return <Redirect href="/(tabs)" />;

  const enter = async () => {
    setBusy(true);
    setTried(true);
    try {
      await signInDev(role, name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: space.xl }}>
        <View style={styles_logo}>
          <AppText style={{ fontSize: 34 }}>⌚</AppText>
        </View>
        <AppText variant="title">أكبادنا</AppText>
        <AppText variant="label">منصة التعليم الذكية</AppText>
      </View>

      <AppText variant="label" style={{ textAlign: "center", marginBottom: space.md }}>
        سجّل الدخول حسب صفتك
      </AppText>

      <View style={{ gap: space.md }}>
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <Card
              key={r.id}
              accent={active ? r.accent : undefined}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: alpha(r.accent, 0.2),
                }}
              >
                <AppText style={{ fontSize: 26 }}>{r.emoji}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{r.label}</AppText>
                <AppText variant="label">{r.sub}</AppText>
              </View>
              <Button
                label={active ? "محدد ✓" : "اختيار"}
                size="sm"
                variant={active ? "solid" : "outline"}
                accent={r.accent}
                onPress={() => setRole(r.id)}
              />
            </Card>
          );
        })}
      </View>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        <AppText variant="label">الاسم</AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="مثال: أبو أحمد"
          placeholderTextColor={color.textDim}
          style={input}
        />

        <AppText variant="label" style={{ marginTop: space.sm }}>
          رقم الجوال
        </AppText>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+9665XXXXXXXX"
          placeholderTextColor={color.textDim}
          style={[input, { textAlign: "left", fontFamily: font.family.mono }]}
        />
        {!phoneAuthAvailable && (
          <AppText variant="label" color={color.yellow}>
            الدخول برمز الجوال يتطلب نسخة تطوير (Dev Build) — استخدم الدخول التجريبي الآن
          </AppText>
        )}
      </View>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Button
          label={phoneAuthAvailable ? "إرسال رمز التحقق" : "الدخول برمز الجوال (قريبًا)"}
          accent={color.blue}
          variant="outline"
          disabled={!phoneAuthAvailable || phone.length < 13}
          onPress={() => {
            /* phone OTP flow — wired when the dev build lands */
          }}
        />
        <Button label="دخول تجريبي سريع" accent={color.teal} loading={busy} onPress={enter} />
        {tried && !busy && !authed && (
          <AppText variant="label" color={color.yellow} style={{ textAlign: "center" }}>
            جارٍ التحضير… إن لم تنتقل الشاشة، فعّل «Anonymous» في مصادقة Firebase.
          </AppText>
        )}
      </View>

      <AppText variant="label" style={{ textAlign: "center", marginTop: space.lg }}>
        {Platform.OS === "web" ? "الويب" : Platform.OS} · إصدار 0.1
      </AppText>
    </Screen>
  );
}

const styles_logo = {
  width: 64,
  height: 64,
  borderRadius: 18,
  backgroundColor: alpha(color.teal, 0.2),
  alignItems: "center" as const,
  justifyContent: "center" as const,
  marginBottom: space.md,
};

const input = {
  backgroundColor: color.surfaceStrong,
  borderColor: color.border,
  borderWidth: 1,
  borderRadius: radius.md,
  paddingHorizontal: space.md,
  paddingVertical: space.md,
  color: color.text,
  fontFamily: font.family.sans,
  fontSize: font.size.md,
};
