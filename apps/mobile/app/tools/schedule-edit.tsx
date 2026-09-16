import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { showAlert } from "@/lib/dialog";
import { router } from "expo-router";
import {
  DEFAULT_PERIODS,
  NOUNS,
  arabicCount,
  SCHEDULE_MESSAGES,
  validateSchedule,
  type PeriodDraft,
} from "@akbadna/core";
import { AppText, Button, Card, Icon, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useClass, useMemberships, useSchool } from "@/data/hooks";
import { saveSchedule } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * The class timetable, written once at the start of the year.
 *
 * Everything on the home card — the current period, the progress bar, the
 * countdown to the next one — reads this. Until it is filled, a real account
 * falls back to sample periods, so the card looks alive while telling the
 * parent nothing true.
 *
 * The form opens on a normal Saudi school day rather than empty: a teacher
 * adjusts times far more readily than they invent ten rows.
 */
export default function ScheduleEdit() {
  const { isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const teach =
    memberships.find((m) => m.role === "teacher" && m.classIds.length) ?? memberships[0];
  const schoolId = teach?.schoolId;
  const classId = teach?.classIds[0];
  const { data: cls } = useClass(schoolId, classId);
  const { data: school } = useSchool(schoolId);

  const existing = cls?.schedule?.["0"];
  const [periods, setPeriods] = useState<PeriodDraft[]>(
    existing?.length
      ? existing.map((p) => ({ name: p.name, start: p.start, end: p.end }))
      : DEFAULT_PERIODS,
  );
  const [days, setDays] = useState<number[]>(school?.weekDays ?? [0, 1, 2, 3, 4]);
  const [busy, setBusy] = useState(false);

  const problems = validateSchedule(periods);
  const problemAt = (i: number) => problems.find((p) => "index" in p && p.index === i);

  const edit = (i: number, patch: Partial<PeriodDraft>) =>
    setPeriods((ps) => ps.map((p, n) => (n === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => setPeriods((ps) => ps.filter((_, n) => n !== i));

  const add = () => {
    const last = periods[periods.length - 1];
    setPeriods((ps) => [
      ...ps,
      { name: "", start: last?.end ?? "07:00", end: last?.end ?? "07:45" },
    ]);
  };

  const save = async () => {
    if (problems.length) return;
    if (!days.length) {
      showAlert("اختر أيام الدراسة", "حدّد يومًا واحدًا على الأقل.");
      return;
    }
    setBusy(true);
    try {
      if (isDemo) {
        showAlert("وضع تجريبي", "سيُحفظ الجدول عند الدخول بحساب حقيقي.");
      } else if (schoolId && classId) {
        await saveSchedule({ schoolId, classId, periods, weekDays: days });
        showAlert("حُفظ الجدول", `طُبِّق على ${arabicCount(days.length, NOUNS.schoolDay)}.`);
      }
      router.back();
    } catch (e) {
      showAlert("تعذّر الحفظ", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const timeBox = (value: string, bad: boolean, onChange: (v: string) => void, label: string) => (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^\d:]/g, "").slice(0, 5))}
      placeholder="07:00"
      placeholderTextColor={color.textDim}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel={label}
      style={{
        width: 74,
        textAlign: "center",
        fontFamily: font.family.num,
        fontSize: font.size.md,
        color: color.text,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: bad ? color.danger : color.borderStrong,
        borderRadius: radius.md,
        paddingVertical: space.sm,
      }}
    />
  );

  return (
    <Screen>
      <AppText variant="label" style={{ paddingTop: space.md, marginBottom: space.sm }}>
        أيام الدراسة:
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
        {DAY_NAMES.map((d, i) => {
          const on = days.includes(i);
          return (
            <Pressable
              key={d}
              onPress={() => setDays((ds) => (on ? ds.filter((x) => x !== i) : [...ds, i]))}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={d}
              style={{
                // A fixed share rather than the text width, so the seven days
                // sit in a 4 + 3 block instead of six then a lone Saturday.
                width: "23.5%",
                alignItems: "center",
                paddingVertical: space.sm,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: on ? color.moeGreen : color.border,
                backgroundColor: on ? color.moeGreenSoft : color.surface,
              }}
            >
              <AppText variant="label" color={on ? color.moeGreen : color.textMuted}>
                {d}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        الحصص:
      </AppText>

      <View style={{ gap: space.sm }}>
        {periods.map((p, i) => {
          const bad = problemAt(i);
          return (
            <Card
              key={i}
              padding={space.md}
              style={bad ? { borderColor: alpha(color.danger, 0.5) } : undefined}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <TextInput
                  value={p.name}
                  onChangeText={(v) => edit(i, { name: v })}
                  placeholder="اسم الحصة"
                  placeholderTextColor={color.textDim}
                  accessibilityLabel={`اسم الحصة ${i + 1}`}
                  style={{
                    flex: 1,
                    fontFamily: font.family.medium,
                    fontSize: font.size.md,
                    color: color.text,
                    backgroundColor: color.surface,
                    borderWidth: 1,
                    borderColor: color.borderStrong,
                    borderRadius: radius.md,
                    paddingHorizontal: space.sm,
                    paddingVertical: space.sm,
                  }}
                />
                <Pressable
                  onPress={() => remove(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`حذف الحصة ${i + 1}`}
                  hitSlop={8}
                >
                  <Icon name="trash-outline" size={18} color={color.danger} />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  marginTop: space.sm,
                }}
              >
                {timeBox(p.start, !!bad, (v) => edit(i, { start: v }), `بداية الحصة ${i + 1}`)}
                <Icon name="arrow-back" size={15} color={color.textDim} />
                {timeBox(p.end, !!bad, (v) => edit(i, { end: v }), `نهاية الحصة ${i + 1}`)}
                <View style={{ flex: 1 }} />
                {bad && (
                  <AppText variant="caption" color={color.danger} style={{ flex: 2 }}>
                    {SCHEDULE_MESSAGES[bad.kind]}
                  </AppText>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Button
        label="إضافة حصة"
        icon="add-outline"
        variant="secondary"
        onPress={add}
        style={{ marginTop: space.md }}
      />

      <Button
        label="حفظ الجدول"
        icon="checkmark-done-outline"
        loading={busy}
        disabled={problems.length > 0}
        onPress={save}
        style={{ marginTop: space.sm }}
      />

      {problems.length > 0 && (
        <AppText
          variant="caption"
          color={color.danger}
          style={{ textAlign: "center", marginTop: space.sm }}
        >
          {problems.length === 1 && problems[0]!.kind === "empty"
            ? SCHEDULE_MESSAGES.empty
            : `صحّح ${arabicCount(problems.length, NOUNS.problem)} قبل الحفظ`}
        </AppText>
      )}

      <AppText variant="caption" style={{ textAlign: "center", marginTop: space.md }}>
        الجدول نفسه يُطبَّق على كل يوم دراسي محدَّد أعلاه.
      </AppText>
    </Screen>
  );
}
