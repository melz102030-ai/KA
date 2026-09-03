import { useState } from "react";
import { Pressable, View } from "react-native";
import type { AttendanceStatus } from "@akbadna/core";
import { AppText, Avatar, Button, Card, Screen } from "@/components";
import { alpha, color, radius, space } from "@/theme";

const ROSTER = [
  { id: "s1", name: "أحمد محمد الغامدي", emoji: "😎" },
  { id: "s2", name: "سارة عبدالله العتيبي", emoji: "🦁" },
  { id: "s3", name: "خالد سعد الدوسري", emoji: "🚀" },
  { id: "s4", name: "نورة فهد الشمري", emoji: "🌺" },
  { id: "s5", name: "عمر ناصر القحطاني", emoji: "⚽" },
  { id: "s6", name: "لينا فيصل الزهراني", emoji: "🌸" },
];

const OPTIONS: { s: AttendanceStatus; label: string; accent: string }[] = [
  { s: "present", label: "حاضر", accent: color.green },
  { s: "late", label: "متأخر", accent: color.yellow },
  { s: "absent", label: "غائب", accent: color.red },
];

export default function Attendance() {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  const counts = OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.s]: Object.values(marks).filter((m) => m === o.s).length }),
    {} as Record<AttendanceStatus, number>,
  );

  return (
    <Screen>
      <AppText variant="title" style={{ paddingTop: space.lg }}>
        📋 الحضور
      </AppText>
      <AppText variant="label" style={{ marginBottom: space.md }}>
        الأول المتوسط - أ · {ROSTER.length} طلاب
      </AppText>

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
        label="⌚ مسح ساعات الطلاب دفعة واحدة (قريبًا)"
        accent={color.teal}
        variant="outline"
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
    </Screen>
  );
}
