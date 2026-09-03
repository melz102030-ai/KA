import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import type { AttendanceStatus } from "@akbadna/core";
import { AppText, Avatar, Button, Card, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { alpha, color, radius, space } from "@/theme";

const ROSTER = [
  { id: "s1", name: "أحمد محمد الغامدي", emoji: "😎", points: 145 },
  { id: "s2", name: "سارة عبدالله العتيبي", emoji: "🦁", points: 198 },
  { id: "s3", name: "خالد سعد الدوسري", emoji: "🚀", points: 112 },
  { id: "s4", name: "نورة فهد الشمري", emoji: "🌺", points: 167 },
  { id: "s5", name: "عمر ناصر القحطاني", emoji: "⚽", points: 89 },
  { id: "s6", name: "لينا فيصل الزهراني", emoji: "🌸", points: 201 },
];

const OPTIONS: { s: AttendanceStatus; label: string; accent: string }[] = [
  { s: "present", label: "حاضر", accent: color.green },
  { s: "late", label: "متأخر", accent: color.yellow },
  { s: "absent", label: "غائب", accent: color.red },
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
      // real: await call("submitAttendance", { schoolId, classId, date, marks: [...] })
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
      <AppText variant="title" style={{ paddingTop: space.lg }}>
        📋 الحضور
      </AppText>
      <AppText variant="label" style={{ marginBottom: space.md }}>
        الأول المتوسط - أ · {ROSTER.length} طلاب
      </AppText>

      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
        {(
          [
            ["roll", "📋 الكشف"],
            ["board", "🏆 المتصدرون"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            label={label}
            variant={subTab === id ? "solid" : "outline"}
            accent={color.teal}
            onPress={() => setSubTab(id)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {subTab === "board" && (
        <View style={{ gap: space.sm }}>
          {board.map((s, i) => (
            <Card key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <AppText variant="mono" style={{ width: 24 }}>
                {["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`}
              </AppText>
              <AppText style={{ fontSize: 24 }}>{s.emoji}</AppText>
              <AppText variant="heading" style={{ flex: 1 }}>
                {s.name.split(" ")[0]}
              </AppText>
              <AppText variant="heading" color={color.yellow}>
                ⭐{s.points}
              </AppText>
            </Card>
          ))}
        </View>
      )}

      {subTab === "roll" && (
        <>
          <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
            {OPTIONS.map((o) => (
              <Card
                key={o.s}
                accent={o.accent}
                style={{ flex: 1, alignItems: "center", paddingVertical: space.sm }}
              >
                <AppText style={{ color: o.accent, fontSize: 20, fontWeight: "900" }}>
                  {counts[o.s] ?? 0}
                </AppText>
                <AppText variant="label">{o.label}</AppText>
              </Card>
            ))}
          </View>

          <Button
            label="⌚ مسح ساعات الطلاب دفعة واحدة"
            accent={color.teal}
            variant="outline"
            onPress={scanAll}
            style={{ marginBottom: space.md }}
          />

          <View style={{ gap: space.sm }}>
            {ROSTER.map((st) => (
              <Card key={st.id} style={{ gap: space.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar emoji={st.emoji} size={44} />
                  <AppText variant="heading" style={{ flex: 1 }}>
                    {st.name}
                  </AppText>
                  <AppText variant="label" color={color.yellow}>
                    ⭐{st.points}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: space.sm }}>
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
                          backgroundColor: active ? alpha(o.accent, 0.22) : color.surfaceStrong,
                          borderWidth: 1,
                          borderColor: active ? o.accent : color.border,
                        }}
                      >
                        <AppText
                          style={{
                            color: active ? o.accent : color.textMuted,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
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
            accent={color.green}
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
