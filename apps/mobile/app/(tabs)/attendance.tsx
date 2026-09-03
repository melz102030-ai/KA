import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import type { AttendanceStatus } from "@akbadna/core";
import { AppText, Avatar, Button, Card, Icon, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, radius, space } from "@/theme";

const ROSTER = [
  { id: "s1", name: "أحمد محمد الغامدي", points: 145 },
  { id: "s2", name: "سارة عبدالله العتيبي", points: 198 },
  { id: "s3", name: "خالد سعد الدوسري", points: 112 },
  { id: "s4", name: "نورة فهد الشمري", points: 167 },
  { id: "s5", name: "عمر ناصر القحطاني", points: 89 },
  { id: "s6", name: "لينا فيصل الزهراني", points: 201 },
];

const OPTIONS: { s: AttendanceStatus; label: string; tone: string }[] = [
  { s: "present", label: "حاضر", tone: color.success },
  { s: "late", label: "متأخر", tone: color.warning },
  { s: "absent", label: "غائب", tone: color.danger },
];

export default function Attendance() {
  const { isDemo } = useAuth();
  const [subTab, setSubTab] = useState<"roll" | "board">("roll");
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const counts = OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.s]: Object.values(marks).filter((m) => m === o.s).length }),
    {} as Record<AttendanceStatus, number>,
  );
  const marked = Object.keys(marks).length;
  const board = useMemo(() => [...ROSTER].sort((a, b) => b.points - a.points), []);

  const scanAll = () => {
    const next: Record<string, AttendanceStatus> = {};
    ROSTER.forEach((s) => (next[s.id] = "present"));
    setMarks(next);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      Alert.alert(
        "تم تسجيل الحضور",
        `حاضر ${counts.present} · متأخر ${counts.late} · غائب ${counts.absent}${
          isDemo ? "\n(وضع تجريبي — لم يُرسل للخادم)" : ""
        }`,
      );
      setMarks({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title" style={{ paddingTop: space.md }}>
        الحضور
      </AppText>
      <AppText variant="label" style={{ marginBottom: space.md }}>
        الأول المتوسط — أ · {ROSTER.length} طلاب
      </AppText>

      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
        {(
          [
            ["roll", "الكشف"],
            ["board", "المتصدّرون"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            label={label}
            variant={subTab === id ? "primary" : "secondary"}
            onPress={() => setSubTab(id)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {subTab === "board" && (
        <View style={{ gap: space.sm }}>
          {board.map((s, i) => (
            <Card key={s.id} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <AppText variant="mono" color={color.textMuted} style={{ width: 22 }}>
                  {i + 1}
                </AppText>
                <Avatar name={s.name} size={36} />
                <AppText variant="subtitle" style={{ flex: 1 }}>
                  {s.name.split(" ").slice(0, 2).join(" ")}
                </AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="star" size={13} color={color.warning} />
                  <AppText variant="subtitle" color={color.text}>
                    {s.points}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {subTab === "roll" && (
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
            {ROSTER.map((st) => (
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
            label={`تسجيل الحضور (${marked}/${ROSTER.length})`}
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
