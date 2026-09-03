import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Redirect } from "expo-router";
import type { Role } from "@akbadna/core";
import { AppText, Button, Card, Field, Icon, type IconName, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, radius, space } from "@/theme";

const ROLES: { id: Role; label: string; sub: string; icon: IconName }[] = [
  { id: "parent", label: "ولي الأمر", sub: "متابعة الأبناء والتنقّل", icon: "people-outline" },
  { id: "teacher", label: "المعلم", sub: "إدارة الفصل والحضور", icon: "school-outline" },
];

export default function SignIn() {
  const { signInDev, phoneAuthAvailable, authed } = useAuth();
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

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
      <View style={{ alignItems: "center", paddingVertical: space.xxxl }}>
        <View style={styles_mark}>
          <Icon name="shield-checkmark" size={30} color={color.primary} />
        </View>
        <AppText variant="title" style={{ marginTop: space.md }}>
          أكبادنا
        </AppText>
        <AppText variant="label">منصة التعليم الذكية</AppText>
      </View>

      <AppText variant="label" style={{ marginBottom: space.sm }}>
        اختر صفتك
      </AppText>
      <View style={{ gap: space.sm }}>
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <Card
              key={r.id}
              onPress={() => setRole(r.id)}
              padding={space.md}
              style={
                active
                  ? { borderColor: color.primary, backgroundColor: color.primarySoft }
                  : undefined
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: alpha(color.primary, active ? 0.14 : 0.08),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={r.icon} size={20} color={color.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{r.label}</AppText>
                  <AppText variant="label">{r.sub}</AppText>
                </View>
                <Icon
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? color.primary : color.textDim}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Field label="الاسم" value={name} onChangeText={setName} placeholder="الاسم الكامل" />
        <Field
          label="رقم الجوال"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+9665XXXXXXXX"
          style={{ textAlign: "left" }}
          hint={
            phoneAuthAvailable
              ? undefined
              : "الدخول برمز الجوال يتطلب نسخة تطوير — استخدم الدخول التجريبي"
          }
        />
      </View>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button
          label={phoneAuthAvailable ? "إرسال رمز التحقق" : "الدخول برمز الجوال (قريبًا)"}
          variant="secondary"
          icon="phone-portrait-outline"
          disabled={!phoneAuthAvailable || phone.length < 13}
        />
        <Button label="دخول تجريبي" icon="log-in-outline" loading={busy} onPress={enter} />
        {tried && !busy && !authed && (
          <AppText variant="caption" color={color.warning} style={{ textAlign: "center" }}>
            جارٍ التحضير… إن لم تنتقل الشاشة، فعّل «Anonymous» في مصادقة Firebase.
          </AppText>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: space.xxl,
        }}
      >
        <Icon name="lock-closed" size={12} color={color.textDim} />
        <AppText variant="caption">
          محمي — {Platform.OS === "web" ? "الويب" : Platform.OS} · إصدار 0.1
        </AppText>
      </View>
    </Screen>
  );
}

const styles_mark = {
  width: 68,
  height: 68,
  borderRadius: 20,
  backgroundColor: color.primarySoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
