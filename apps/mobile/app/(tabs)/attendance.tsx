import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import type { AttendanceStatus, Kid } from "@akbadna/core";
import { AppText, Avatar, Button, Card, EmptyState, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useClass, useMemberships, useRoster } from "@/data/hooks";
import { submitAttendance } from "@/data/mutations";
import { alpha, color, radius, space } from "@/theme";

const OPTIONS: { s: AttendanceStatus; label: string; tone: string }[] = [
  { s: "present", label: "حاضر", tone: color.success },
  { s: "late", label: "متأخر", tone: color.warning },
  { s: "absent", label: "غائب", tone: color.danger },
];

const DEMO_ROSTER = [
  { id: "s1", name: "أحمد محمد الغامدي" },
  { id: "s2", name: "سارة عبدالله العتيبي" },
  { id: "s3", name: "خالد سعد الدوسري" },
  { id: "s4", name: "نورة فهد الشمري" },
  { id: "s5", name: "عمر ناصر القحطاني" },
  { id: "s6", name: "لينا فيصل الزهراني" },
];

export default function Attendance() {
  const { isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const teach = memberships.find((m) => m.role === "teacher" && m.classIds.length);
  const schoolId = teach?.schoolId;
  const classId = teach?.classIds[0];
  const { data: cls } = useClass(schoolId, classId);
  const { data: rosterKids } = useRoster(cls?.studentIds ?? []);

  const roster: { id: string; name: string }[] = isDemo
    ? DEMO_ROSTER
    : rosterKids.map((k: Kid) => ({ id: k.id, name: k.name }));

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const counts = OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.s]: Object.values(marks).filter((m) => m === o.s).length }),
    {} as Record<AttendanceStatus, number>,
  );
  const marked = Object.keys(marks).length;

  const scanAll = () => {
    const next: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => (next[s.id] = "present"));
    setMarks(next);
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (!isDemo && schoolId && classId) {
        await submitAttendance({
          schoolId,
          classId,
          date: new Date().toISOString().slice(0, 10),
          marks: Object.entries(marks).map(([kidId, status]) => ({ kidId, status })),
        });
      }
      Alert.alert(
        "تم تسجيل الحضور",
        `حاضر ${counts.present} · متأخر ${counts.late} · غائب ${counts.absent}${
          isDemo || !schoolId ? "\n(وضع تجريبي — لم يُرسل للخادم)" : ""
        }`,
      );
      setMarks({});
    } catch (e) {
      Alert.alert("تعذّر الحفظ", e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const title = isDemo ? "الأول المتوسط — أ" : (cls?.name ?? "لا يوجد فصل");

  return (
    <Screen>
      <AppText variant="title" style={{ paddingTop: space.md }}>
        الحضور
      </AppText>
      <AppText variant="label" style={{ marginBottom: space.md }}>
        {title} · {roster.length} طلاب
      </AppText>

      {!isDemo && !classId && (
        <EmptyState
          icon="school-outline"
          title="لا يوجد فصل مرتبط"
          subtitle="أنشئ مدرسة وفصلًا من إعداد المعلم لبدء تسجيل الحضور."
        />
      )}

      {roster.length > 0 && (
        <>
          <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
            {OPTIONS.map((o) => (
              <View key={o.s} style={[styles_stat, { borderColor: alpha(o.tone, 0.35) }]}>
                <AppText style={{ fontFamily: "Tajawal_900Black", fontSize: 20, color: o.tone }}>
                  {counts[o.s] ?? 0}
                </AppText>
                <AppText variant="caption">{o.label}</AppText>
              </View>
            ))}
          </View>

          <Button
            label="تسجيل الحضور بمسح الساعات"
            variant="secondary"
            icon="scan-outline"
            onPress={scanAll}
            style={{ marginBottom: space.md }}
          />

          <View style={{ gap: space.sm }}>
            {roster.map((st) => (
              <Card key={st.id} padding={space.md}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar name={st.name} size={38} />
                  <AppText variant="subtitle" style={{ flex: 1 }}>
                    {st.name}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
                  {OPTIONS.map((o) => {
                    const active = marks[st.id] === o.s;
                    return (
                      <Pressable
                        key={o.s}
                        onPress={() => setMarks((p) => ({ ...p, [st.id]: o.s }))}
                        style={{
                          flex: 1,
                          paddingVertical: space.sm,
                          borderRadius: radius.md,
                          alignItems: "center",
                          backgroundColor: active ? alpha(o.tone, 0.12) : color.bg,
                          borderWidth: 1,
                          borderColor: active ? o.tone : color.border,
                        }}
                      >
                        <AppText
                          variant="label"
                          color={active ? o.tone : color.textMuted}
                          weight={active ? "bold" : "regular"}
                        >
                          {o.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ))}
          </View>

          <Button
            label={`تسجيل الحضور (${marked}/${roster.length})`}
            icon="checkmark-done-outline"
            loading={saving}
            disabled={marked === 0}
            onPress={submit}
            style={{ marginTop: space.lg }}
          />
        </>
      )}
    </Screen>
  );
}

const styles_stat = {
  flex: 1,
  alignItems: "center" as const,
  backgroundColor: color.surface,
  borderWidth: 1,
  borderRadius: radius.md,
  paddingVertical: space.sm,
};
