import { useEffect, useState } from "react";
import { Image, Platform, useWindowDimensions, View } from "react-native";
import { Redirect } from "expo-router";
import { NATIONAL_ID_MESSAGES, nationalIdProblem, type Role } from "@akbadna/core";
import { AppText, Button, Card, Field, Icon, type IconName, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, font, radius, space } from "@/theme";
import MARK from "../../assets/icon.png";

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

type Mode = "signIn" | "register";

export default function SignIn() {
  const {
    signInDev,
    signInWithNationalId,
    registerWithNationalId,
    startPhoneVerification,
    confirmPhoneCode,
    resetPhone,
    phoneStep,
    phoneAuthAvailable,
    authed,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("signIn");
  const [role, setRole] = useState<Role>("parent");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (authed) setBusy(false);
  }, [authed]);

  const desktop = Platform.OS === "web" && width >= 900 && height >= 600;
  const tight = !desktop && height < 820;

  const gap = tight ? space.md : space.lg;
  const mark = tight ? 62 : 80;

  if (authed) return <Redirect href="/(tabs)" />;

  const wrap = (fn: () => Promise<void>) => async () => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(readable(e));
    } finally {
      setBusy(false);
    }
  };

  const idFault = nationalIdProblem(nationalId);

  const doSignIn = wrap(async () => {
    if (idFault) throw new Error(NATIONAL_ID_MESSAGES[idFault]);
    if (password.length < 6) throw new Error("كلمة المرور ستة أحرف على الأقل");
    await signInWithNationalId(nationalId.trim(), password, role);
  });

  const doRegister = wrap(async () => {
    if (idFault) throw new Error(NATIONAL_ID_MESSAGES[idFault]);
    if (!name.trim()) throw new Error("أدخل الاسم الكامل");
    if (!/^\+9665\d{8}$/.test(phone.trim()))
      throw new Error("أدخل جوالًا سعوديًا بصيغة +9665XXXXXXXX");
    if (password.length < 6) throw new Error("كلمة المرور ستة أحرف على الأقل");
    await registerWithNationalId({
      nationalId: nationalId.trim(),
      password,
      displayName: name.trim(),
      phone: phone.trim(),
      role,
    });
  });

  const enter = wrap(() => signInDev(role, name));
  const sendOtp = wrap(() => startPhoneVerification(phone.trim()));
  const verifyOtp = wrap(() => confirmPhoneCode(otp.trim(), role, name));

  /* ── The mark, and the line it carries ────────────────────────────────── */
  const brand = (
    <View style={{ alignItems: desktop ? "flex-start" : "center" }}>
      <View
        style={{
          width: mark,
          height: mark,
          borderRadius: Math.round(mark * 0.28),
          overflow: "hidden",
          borderWidth: 2,
          borderColor: alpha(color.moeGreen, 0.25),
          backgroundColor: color.surface,
        }}
      >
        <Image source={MARK} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <AppText
        variant="title"
        style={[
          { marginTop: space.md, color: color.moeGreen },
          desktop && { fontSize: font.size.xxl, lineHeight: 40 },
        ]}
      >
        أكبادنا
      </AppText>
      <AppText
        variant="label"
        style={[{ color: color.textMuted }, desktop && { fontSize: font.size.md, lineHeight: 24 }]}
      >
        أولادنا تمشي على الأرض
      </AppText>
      {/* A thin rule in the state green, the way official services mark a header. */}
      <View
        style={{
          height: 3,
          width: 54,
          borderRadius: 2,
          backgroundColor: color.moeGreen,
          marginTop: space.sm,
        }}
      />
    </View>
  );

  /* ── Identity fields ──────────────────────────────────────────────────── */
  const idField = (
    <Field
      label="رقم الهوية / الإقامة"
      value={nationalId}
      onChangeText={(v) => setNationalId(v.replace(/\D/g, "").slice(0, 10))}
      keyboardType="number-pad"
      placeholder="1XXXXXXXXX"
      style={{ textAlign: "left", letterSpacing: 2 }}
      error={nationalId.length === 10 && idFault ? NATIONAL_ID_MESSAGES[idFault] : undefined}
    />
  );

  const passwordField = (
    <Field
      label="كلمة المرور"
      value={password}
      onChangeText={setPassword}
      secureTextEntry
      placeholder="••••••••"
      style={{ textAlign: "left" }}
    />
  );

  const form = (
    <>
      {/* Sign in / new account */}
      <View style={{ flexDirection: "row", gap: space.xs, marginBottom: gap }}>
        {(
          [
            ["signIn", "تسجيل الدخول"],
            ["register", "مستخدم جديد"],
          ] as const
        ).map(([m, label]) => {
          const on = mode === m;
          return (
            <Button
              key={m}
              label={label}
              size="sm"
              variant={on ? "primary" : "ghost"}
              onPress={() => {
                setMode(m);
                setErr(null);
              }}
              style={{ flex: 1 }}
            />
          );
        })}
      </View>

      {/* Shown for signing in too: an account may belong to someone who is
          both a parent and a teacher, and this is the mode they enter in. */}
      <>
        <AppText variant="label" style={{ marginBottom: space.sm }}>
          {mode === "register" ? "اختر صفتك:" : "ادخل بصفة:"}
        </AppText>
        <View style={{ gap: space.sm, marginBottom: gap }}>
          {ROLES.map((r) => {
            const active = role === r.id;
            return (
              <Card
                key={r.id}
                onPress={() => setRole(r.id)}
                padding={tight ? space.sm : space.md}
                style={
                  active
                    ? { borderColor: color.moeGreen, backgroundColor: color.moeGreenSoft }
                    : undefined
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.md,
                      backgroundColor: alpha(color.moeGreen, active ? 0.14 : 0.07),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={r.icon} size={19} color={color.moeGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{r.label}</AppText>
                    <AppText variant="label">{r.sub}</AppText>
                  </View>
                  <Icon
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? color.moeGreen : color.textDim}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      </>

      <View style={{ gap: space.md }}>
        {idField}
        {mode === "register" && (
          <Field
            label="الاسم الكامل"
            value={name}
            onChangeText={setName}
            placeholder="الاسم الرباعي"
          />
        )}
        {mode === "register" && phoneStep === "idle" && (
          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+9665XXXXXXXX"
            style={{ textAlign: "left" }}
            hint="يجب أن يكون الجوال المسجّل باسمك في أبشر"
          />
        )}
        {phoneStep === "idle" ? (
          passwordField
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
        {phoneStep !== "idle" ? (
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
        ) : mode === "signIn" ? (
          <>
            <Button
              label="دخول"
              icon="log-in-outline"
              loading={busy}
              disabled={nationalId.length !== 10 || password.length < 6}
              onPress={doSignIn}
            />
            <Button
              label={phoneAuthAvailable ? "الدخول برمز الجوال" : "رمز الجوال (على الأجهزة قريبًا)"}
              variant="secondary"
              icon="phone-portrait-outline"
              disabled={!phoneAuthAvailable || phone.trim().length < 13}
              onPress={sendOtp}
            />
          </>
        ) : (
          <Button
            label="إنشاء الحساب"
            icon="person-add-outline"
            loading={busy}
            disabled={nationalId.length !== 10 || password.length < 6 || !name.trim()}
            onPress={doRegister}
          />
        )}

        <Button label="دخول تجريبي" variant="ghost" icon="flask-outline" onPress={enter} />

        {err && (
          <AppText variant="caption" color={color.danger} style={{ textAlign: "center" }}>
            {err}
          </AppText>
        )}
      </View>

      {/* Said plainly, because claiming otherwise would be claiming a government check. */}
      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          marginTop: gap,
          padding: space.sm,
          borderRadius: radius.md,
          backgroundColor: color.surfaceAlt,
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <Icon name="information-circle-outline" size={15} color={color.textMuted} />
        <AppText variant="caption" style={{ flex: 1 }}>
          التحقق من الهوية عبر أبشر / نفاذ غير مفعّل بعد. يُتحقق حاليًا من صحة صيغة رقم الهوية ومن
          ملكية رقم الجوال برمز نصي.
        </AppText>
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
                      backgroundColor: alpha(color.moeGreen, 0.08),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={p.icon} size={19} color={color.moeGreen} />
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
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: "center", paddingVertical: tight ? space.md : space.lg }}>
          {brand}
        </View>
        {form}
        <View style={{ flex: 2, minHeight: space.lg }} />
        {footer}
      </View>
    </Screen>
  );
}

/** Firebase's auth codes, said in Arabic. */
function readable(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String(e.code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "رقم الهوية أو كلمة المرور غير صحيحة";
    case "auth/email-already-in-use":
      return "يوجد حساب بهذا الرقم — سجّل الدخول بدلًا من إنشاء حساب";
    case "auth/weak-password":
      return "كلمة المرور ضعيفة — ستة أحرف على الأقل";
    case "auth/too-many-requests":
      return "محاولات كثيرة، انتظر قليلًا ثم أعد المحاولة";
    case "auth/network-request-failed":
      return "تعذّر الاتصال بالشبكة";
    case "auth/operation-not-allowed":
      return "الدخول بكلمة المرور غير مفعّل في مشروع Firebase";
    default:
      return e instanceof Error ? e.message : "حدث خطأ";
  }
}
