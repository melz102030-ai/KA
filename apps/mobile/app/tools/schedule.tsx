import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Card, Pill, Screen } from "@/components";
import { DEMO_SCHEDULE } from "@/data/demo";
import { clockToMinutes, minutesOfDay } from "@/lib/time";
import { alpha, color, radius, space } from "@/theme";

const KIND_ACCENT: Record<string, string> = {
  assembly: color.yellow,
  lesson: color.teal,
  break: color.green,
  dismissal: color.blue,
};

export default function ScheduleScreen() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const m = minutesOfDay(now);

  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.md }}>
        {DEMO_SCHEDULE.map((p) => {
          const active = m >= clockToMinutes(p.start) && m < clockToMinutes(p.end);
          const done = clockToMinutes(p.end) <= m;
          const accent = KIND_ACCENT[p.kind] ?? color.teal;
          return (
            <Card
              key={p.index}
              accent={active ? accent : undefined}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                opacity: done && !active ? 0.45 : 1,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: alpha(accent, 0.18),
                }}
              >
                <AppText style={{ fontSize: 18 }}>{done && !active ? "✓" : "•"}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{p.name}</AppText>
                <AppText variant="label">
                  {p.start} – {p.end}
                </AppText>
              </View>
              {active && <Pill label="الآن" accent={accent} />}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
