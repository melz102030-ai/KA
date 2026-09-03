import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { AppText, Button, Card, Field, Icon, Screen, SectionHeader } from "@/components";
import { useAuth } from "@/lib/auth";
import { createFamily, createSchoolWithClass, joinByCode } from "@/data/mutations";
import { color, space } from "@/theme";

export default function Onboarding() {
  const { profile, signOut } = useAuth();
  const role = profile?.activeRole ?? "parent";
  const [busy, setBusy] = useState(false);

  const done = () => router.replace("/(tabs)");
  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert("تعذّر الإكمال", e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <View style={styles_mark}>
          <Icon name="sparkles-outline" size={26} color={color.primary} />
        </View>
        <AppText variant="title" style={{ marginTop: space.md }}>
          خطوة أخيرة
        </AppText>
        <AppText variant="label" style={{ textAlign: "center" }}>
          {role === "teacher" ? "أنشئ مدرستك أو انضم لواحدة موجودة" : "أضف أبناءك لبدء المتابعة"}
        </AppText>
      </View>

      {role === "teacher" ? (
        <TeacherSetup onRun={guard} busy={busy} done={done} />
      ) : (
        <ParentSetup onRun={guard} busy={busy} done={done} />
      )}

      <Button
        label="تسجيل الخروج"
        variant="ghost"
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        }}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}

/* ── Parent ────────────────────────────────────────────────────────────── */

function ParentSetup({
  onRun,
  busy,
  done,
}: {
  onRun: (fn: () => Promise<void>) => Promise<void>;
  busy: boolean;
  done: () => void;
}) {
  const [kids, setKids] = useState([{ name: "", grade: "" }]);
  const [code, setCode] = useState("");

  const set = (i: number, k: "name" | "grade", v: string) =>
    setKids((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const valid = kids.some((k) => k.name.trim());

  const submit = () =>
    onRun(async () => {
      const payload = kids
        .filter((k) => k.name.trim())
        .map((k) => ({ name: k.name.trim(), gradeLabel: k.grade.trim() || undefined }));
      const { kidIds } = await createFamily(payload);
      if (code.trim()) await joinByCode(code, "parent", kidIds);
      done();
    });

  return (
    <View>
      <SectionHeader>الأبناء</SectionHeader>
      <View style={{ gap: space.sm }}>
        {kids.map((k, i) => (
          <Card key={i} padding={space.md}>
            <View style={{ gap: space.sm }}>
              <Field
                label={`الطفل ${i + 1}`}
                value={k.name}
                onChangeText={(v) => set(i, "name", v)}
                placeholder="الاسم"
              />
              <Field
                value={k.grade}
                onChangeText={(v) => set(i, "grade", v)}
                placeholder="الصف (اختياري) — مثال: أول متوسط"
              />
              {kids.length > 1 && (
                <Button
                  label="حذف"
                  variant="ghost"
                  size="sm"
                  onPress={() => setKids((p) => p.filter((_, idx) => idx !== i))}
                />
              )}
            </View>
          </Card>
        ))}
      </View>
      <Button
        label="إضافة طفل آخر"
        variant="secondary"
        size="sm"
        icon="add-outline"
        onPress={() => setKids((p) => [...p, { name: "", grade: "" }])}
        style={{ marginTop: space.sm }}
      />

      <SectionHeader>رمز المدرسة (اختياري)</SectionHeader>
      <Field
        value={code}
        onChangeText={(v) =>
          setCode(
            v
              .toUpperCase()
              .replace(/[^2-9A-HJ-NP-Z]/g, "")
              .slice(0, 6),
          )
        }
        placeholder="ABCDEF"
        autoCapitalize="characters"
        style={{ textAlign: "left", letterSpacing: 3 }}
      />

      <Button
        label="إنشاء الحساب العائلي"
        onPress={submit}
        loading={busy}
        disabled={!valid}
        icon="checkmark-outline"
        style={{ marginTop: space.lg }}
      />
    </View>
  );
}

/* ── Teacher ───────────────────────────────────────────────────────────── */

function TeacherSetup({
  onRun,
  busy,
  done,
}: {
  onRun: (fn: () => Promise<void>) => Promise<void>;
  busy: boolean;
  done: () => void;
}) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [school, setSchool] = useState("");
  const [cls, setCls] = useState("");
  const [grade, setGrade] = useState("");
  const [code, setCode] = useState("");

  return (
    <View>
      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
        <Button
          label="إنشاء مدرسة"
          variant={mode === "create" ? "primary" : "secondary"}
          onPress={() => setMode("create")}
          style={{ flex: 1 }}
        />
        <Button
          label="الانضمام برمز"
          variant={mode === "join" ? "primary" : "secondary"}
          onPress={() => setMode("join")}
          style={{ flex: 1 }}
        />
      </View>

      {mode === "create" ? (
        <View style={{ gap: space.md }}>
          <Field
            label="اسم المدرسة"
            value={school}
            onChangeText={setSchool}
            placeholder="مثال: متوسطة النور"
          />
          <Field
            label="اسم الفصل"
            value={cls}
            onChangeText={setCls}
            placeholder="مثال: أول متوسط - أ"
          />
          <Field label="الصف" value={grade} onChangeText={setGrade} placeholder="مثال: أول متوسط" />
          <Button
            label="إنشاء"
            loading={busy}
            disabled={!school.trim() || !cls.trim() || !grade.trim()}
            icon="business-outline"
            onPress={() =>
              onRun(async () => {
                const res = await createSchoolWithClass({
                  schoolName: school.trim(),
                  className: cls.trim(),
                  grade: grade.trim(),
                });
                Alert.alert(
                  "تم إنشاء المدرسة",
                  `رمز انضمام أولياء الأمور:\n\n${res.joinCode}\n\nشاركه مع أولياء أمور الفصل.`,
                  [{ text: "متابعة", onPress: done }],
                );
              })
            }
          />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Field
            label="رمز المدرسة"
            value={code}
            onChangeText={(v) =>
              setCode(
                v
                  .toUpperCase()
                  .replace(/[^2-9A-HJ-NP-Z]/g, "")
                  .slice(0, 6),
              )
            }
            placeholder="ABCDEF"
            autoCapitalize="characters"
            style={{ textAlign: "left", letterSpacing: 3 }}
          />
          <Button
            label="انضمام"
            loading={busy}
            disabled={code.length < 6}
            icon="enter-outline"
            onPress={() =>
              onRun(async () => {
                await joinByCode(code, "teacher");
                done();
              })
            }
          />
        </View>
      )}
    </View>
  );
}

const styles_mark = {
  width: 60,
  height: 60,
  borderRadius: 18,
  backgroundColor: color.primarySoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
