import { useEffect, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Redirect } from "expo-router";
import type { Role } from "@akbadna/core";
import { AppText, Button, Card, Field, Icon, type IconName, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, font, radius, space } from "@/theme";

const ROLES: { id: Role; label: string; sub: string; icon: IconName }[] = [
  { id: "parent", label: "ولي الأمر", sub: "متابعة الأبناء والتنقّل", icon: "people-outline" },
  { id: "teacher", label: "المعلم", sub: "إدارة الفصل والحضور", icon: "school-outline" },
];

/** Desktop only — fills the second column, which would otherwise be dead space. */
const PITCH: { icon: IconName; title: string; sub: string }[] = [
  { icon: "location-outline", title: "تتبّع لحظي", sub: "موقع الابن على الخريطة طوال اليوم" },
  { icon: "checkmark-done-outline", title: "حضور وغياب", sub: "إشعار فور دخول الفصل أو مغادرته" },
  { icon: "car-outline", title: "تنقّل آمن", sub: "رحلات مدرسية بسائقين موثّقين" },
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
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (authed) setBusy(false);
  }, [authed]);

  // A real desktop window earns two columns. Anything narrower — a phone, a
  // tablet in portrait, half a browser window — keeps the single column.
  const desktop = Platform.OS === "web" && width >= 900 && height >= 600;
  // Short viewports tighten every vertical gap so the whole form still lands
  // above the fold on a small phone.
  const tight = !desktop && height < 780;

  const gap = tight ? space.md : space.xl;
  const mark = tight ? 52 : 68;
  const rolePad = tight ? space.sm : space.md;

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

  const brand = (
    <View style={{ alignItems: desktop ? "flex-start" : "center" }}>
      <View
        style={{
          width: mark,
          height: mark,
          borderRadius: Math.round(mark * 0.3),
          backgroundColor: color.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="shield-checkmark" size={Math.round(mark * 0.44)} color={color.primary} />
      </View>
      <AppText
        variant="title"
        style={[{ marginTop: space.md }, desktop && { fontSize: font.size.xxl, lineHeight: 40 }]}
      >
        أكبادنا
      </AppText>
      <AppText variant="label" style={desktop && { fontSize: font.size.md, lineHeight: 24 }}>
        منصة التعليم الذكية
      </AppText>
    </View>
  );

  const form = (
    <>
      <AppText variant="label" style={{ marginBottom: space.sm }}>
        اختر صفتك:
      </AppText>
      <View style={{ gap: space.sm }}>
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <Card
              key={r.id}
              onPress={() => setRole(r.id)}
              padding={rolePad}
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

      <View style={{ gap: space.md, marginTop: gap }}>
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

      <View style={{ gap: space.sm, marginTop: gap }}>
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
    </>
  );

  const footer = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: desktop ? "flex-start" : "center",
        gap: 6,
      }}
    >
      <Icon name="lock-closed" size={12} color={color.textDim} />
      <AppText variant="caption">
        محمي — {Platform.OS === "web" ? "الويب" : Platform.OS} · إصدار 0.1
      </AppText>
    </View>
  );

  if (desktop) {
    return (
      <Screen fit maxWidth={1060}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: space.xxxl,
          }}
        >
          <View style={{ flex: 1, maxWidth: 380, gap: space.xxl }}>
            {brand}
            <View style={{ gap: space.lg }}>
              {PITCH.map((p) => (
                <View
                  key={p.title}
                  style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.md,
                      backgroundColor: alpha(color.primary, 0.08),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={p.icon} size={19} color={color.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{p.title}</AppText>
                    <AppText variant="label">{p.sub}</AppText>
                  </View>
                </View>
              ))}
            </View>
            {footer}
          </View>

          <Card style={{ flex: 1, maxWidth: 430 }} padding={space.xl}>
            {form}
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen fit>
      <View style={{ flex: 1 }}>
        {/* The two spacers share whatever height is left over on a tall phone,
            1:2 above/below; both collapse to nothing on a short one. */}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: "center", paddingVertical: tight ? space.md : space.xl }}>
          {brand}
        </View>
        {form}
        <View style={{ flex: 2, minHeight: space.lg }} />
        {footer}
      </View>
    </Screen>
  );
}
