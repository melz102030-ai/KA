import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Badge, Icon, type IconName, Screen } from "@/components";
import { useClass, useKids, useSchedule } from "@/data/hooks";
import { clockToMinutes, minutesOfDay } from "@/lib/time";
import { color, space } from "@/theme";

const KIND: Record<string, { icon: IconName; label: string }> = {
  assembly: { icon: "flag-outline", label: "طابور" },
  lesson: { icon: "book-outline", label: "حصة" },
  break: { icon: "cafe-outline", label: "استراحة" },
  dismissal: { icon: "exit-outline", label: "انصراف" },
};

export default function ScheduleScreen() {
  const { data: kids } = useKids();
  const first = kids[0];
  const { data: cls } = useClass(first?.schoolId, first?.classId);
  const periods = useSchedule(cls);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const m = minutesOfDay(now);

  return (
    <Screen>
      <View style={{ paddingTop: space.md }}>
        {periods.map((p, i) => {
          const active = m >= clockToMinutes(p.start) && m < clockToMinutes(p.end);
          const done = clockToMinutes(p.end) <= m;
          const k = KIND[p.kind] ?? KIND.lesson!;
          return (
            <View key={p.index} style={{ flexDirection: "row", gap: space.md }}>
              {/* timeline rail */}
              <View style={{ alignItems: "center", width: 28 }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: active
                      ? color.primary
                      : done
                        ? color.borderStrong
                        : color.surface,
                    borderWidth: 2,
                    borderColor: active ? color.primary : color.borderStrong,
                  }}
                />
                {i < periods.length - 1 && (
                  <View style={{ flex: 1, width: 2, backgroundColor: color.border }} />
                )}
              </View>

              <View
                style={{ flex: 1, paddingBottom: space.lg, opacity: done && !active ? 0.5 : 1 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Icon name={k.icon} size={16} color={color.textMuted} />
                  <AppText variant="subtitle" style={{ flex: 1 }}>
                    {p.name}
                  </AppText>
                  {active && <Badge label="الآن" tone="primary" />}
                </View>
                <AppText variant="label">
                  {p.start} – {p.end}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
