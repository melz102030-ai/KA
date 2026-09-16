import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { GRADES_BY_STAGE, STAGE_LABELS, type Gender, type Stage } from "@akbadna/core";
import { AppText, Button, Card, Field, Icon, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { addKid } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

const GENDERS: { id: Gender; label: string; icon: "male-outline" | "female-outline" }[] = [
  { id: "boy", label: "ابن", icon: "male-outline" },
  { id: "girl", label: "ابنة", icon: "female-outline" },
];

const STAGES: Stage[] = ["primary", "intermediate", "secondary"];

/**
 * Adding a child after the first sign-up.
 *
 * The gender and grade asked for here are not decoration: the gender decides
 * which school the child can be enrolled in at all, and the grade is what the
 * home screen groups by. A child added without them lands under «لم تُستكمل
 * بياناتهم», so the form asks for both up front rather than leaving it to a
 * later edit nobody makes.
 */
export default function AddKid() {
  const { isDemo } = useAuth();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [stage, setStage] = useState<Stage>("primary");
  const [grade, setGrade] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = name.trim().length > 1 && gender !== null && grade !== null;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      if (isDemo) {
        Alert.alert("وضع تجريبي", `سيُضاف ${name.trim()} عند الدخول بحساب حقيقي.`);
      } else {
        await addKid({ name: name.trim(), gender: gender!, grade: grade! });
        Alert.alert(
          "أُضيف الابن",
          "لربطه بفصل، استخدم رمز الدعوة من معلم الفصل. لن يظهر في قائمة الفصل حتى يعتمده المعلم.",
        );
      }
      router.back();
    } catch (e) {
      Alert.alert("تعذّرت الإضافة", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean) => ({
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: on ? color.moeGreen : color.border,
    backgroundColor: on ? color.moeGreenSoft : color.surface,
  });

  return (
    <Screen>
      <Field
        label="اسم الابن أو الابنة"
        value={name}
        onChangeText={setName}
        placeholder="الاسم الكامل"
      />

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        الجنس:
      </AppText>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {GENDERS.map((g) => {
          const on = gender === g.id;
          return (
            <Card
              key={g.id}
              onPress={() => setGender(g.id)}
              padding={space.md}
              style={[
                { flex: 1 },
                on ? { borderColor: color.moeGreen, backgroundColor: color.moeGreenSoft } : null,
              ]}
            >
              <View style={{ alignItems: "center", gap: 4 }}>
                <Icon name={g.icon} size={22} color={on ? color.moeGreen : color.textDim} />
                <AppText variant="subtitle" color={on ? color.moeGreen : color.text}>
                  {g.label}
                </AppText>
              </View>
            </Card>
          );
        })}
      </View>
      <AppText variant="caption" style={{ marginTop: space.xs }}>
        يحدّد المدرسة التي يمكن قيده فيها — بنين أو بنات.
      </AppText>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        المرحلة:
      </AppText>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {STAGES.map((st) => {
          const on = stage === st;
          return (
            <Button
              key={st}
              label={STAGE_LABELS[st]}
              size="sm"
              variant={on ? "primary" : "ghost"}
              onPress={() => {
                setStage(st);
                setGrade(null);
              }}
              style={{ flex: 1 }}
            />
          );
        })}
      </View>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        الصف:
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {GRADES_BY_STAGE[stage].map((g) => {
          const on = grade === g.grade;
          return (
            <Pressable
              key={g.grade}
              onPress={() => setGrade(g.grade)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={g.label}
              style={chip(on)}
            >
              <AppText
                variant="label"
                color={on ? color.moeGreen : color.text}
                weight={on ? "bold" : "regular"}
              >
                {g.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="إضافة"
        icon="person-add-outline"
        loading={busy}
        disabled={!ready}
        onPress={save}
        style={{ marginTop: space.xl }}
      />

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          marginTop: space.lg,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: alpha(color.moeGreen, 0.06),
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <Icon name="information-circle-outline" size={16} color={color.textMuted} />
        <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>
          بعد الإضافة، اربطه بفصله برمز الدعوة من معلم الفصل. الطالب لا يدخل قائمة الفصل إلا باعتماد
          المعلم.
        </AppText>
      </View>

      <AppText
        variant="caption"
        style={{ textAlign: "center", marginTop: space.md, fontFamily: font.family.regular }}
      >
        يُنشأ للابن معرّف أكبادنا تلقائيًا عند الإضافة.
      </AppText>
    </Screen>
  );
}
