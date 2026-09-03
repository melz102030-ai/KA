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
  const {
    signInDev,
    startPhoneVerification,
    confirmPhoneCode,
    resetPhone,
    phoneStep,
    phoneAuthAvailable,
    authed,
  } = useAuth();
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authed) setBusy(false);
  }, [authed]);

  if (authed) return <Redirect href="/(tabs)" />;

  const wrap = (fn: () => Promise<void>) => async () => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const enter = wrap(() => signInDev(role, name));
  const sendOtp = wrap(() => startPhoneVerification(phone.trim()));
  const verifyOtp = wrap(() => confirmPhoneCode(otp.trim(), role, name));

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

        {phoneStep === "idle" ? (
          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+9665XXXXXXXX"
            style={{ textAlign: "left" }}
            hint={
              phoneAuthAvailable
                ? "سيصلك رمز تحقق برسالة نصية"
                : "الدخول برمز الجوال يتطلب نسخة تطوير على الأجهزة"
            }
          />
        ) : (
          <Field
            label={`رمز التحقق المرسل إلى ${phone}`}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            placeholder="______"
            style={{ textAlign: "left", letterSpacing: 6 }}
          />
        )}
      </View>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {phoneStep === "idle" ? (
          <Button
            label={
              phoneAuthAvailable ? "إرسال رمز التحقق" : "الدخول برمز الجوال (على الأجهزة قريبًا)"
            }
            variant="secondary"
            icon="phone-portrait-outline"
            loading={busy}
            disabled={!phoneAuthAvailable || phone.trim().length < 13}
            onPress={sendOtp}
          />
        ) : (
          <>
            <Button
              label="تأكيد الرمز"
              icon="checkmark-outline"
              loading={busy}
              disabled={otp.length < 6}
              onPress={verifyOtp}
            />
            <Button label="تغيير الرقم" variant="ghost" onPress={resetPhone} />
          </>
        )}
        <Button label="دخول تجريبي" variant="ghost" icon="log-in-outline" onPress={enter} />
        {err && (
          <AppText variant="caption" color={color.danger} style={{ textAlign: "center" }}>
            {err}
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
