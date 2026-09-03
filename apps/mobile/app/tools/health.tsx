import { View } from "react-native";
import { AppText, Avatar, Card, Pill, ProgressBar, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { useVitalsColor } from "@/lib/time";
import { color, space } from "@/theme";

export default function HealthScreen() {
  const { data: kids } = useKids();
  const vc = useVitalsColor();

  return (
    <Screen>
      <View style={{ gap: space.md, paddingTop: space.md }}>
        {kids.map((k) => {
          const hr = k.live.heartRate ?? 0;
          const temp = k.live.skinTempC ?? 0;
          const batt = k.live.batteryPct ?? 0;
          const steps = k.live.steps ?? 0;
          const rows: { label: string; value: string; pct: number; accent: string }[] = [
            {
              label: "نبضات القلب",
              value: `${Math.round(hr)} bpm`,
              pct: hr / 150,
              accent: vc.heartRate(hr),
            },
            {
              label: "حرارة الجلد",
              value: `${temp.toFixed(1)}°`,
              pct: (temp - 34) / 6,
              accent: color.teal,
            },
            {
              label: "البطارية",
              value: `${Math.round(batt)}%`,
              pct: batt / 100,
              accent: vc.battery(batt),
            },
            { label: "الخطوات اليوم", value: `${steps}`, pct: steps / 8000, accent: color.yellow },
          ];
          return (
            <Card key={k.id}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  marginBottom: space.md,
                }}
              >
                <Avatar emoji={k.photoEmoji} size={48} />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{k.name}</AppText>
                  <AppText variant="label">{k.gradeLabel}</AppText>
                </View>
                <Pill
                  label={k.live.watchOnline ? "متصلة" : "غير متصلة"}
                  accent={k.live.watchOnline ? color.green : color.textDim}
                />
              </View>
              <View style={{ gap: space.md }}>
                {rows.map((r) => (
                  <View key={r.label} style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <AppText variant="label">{r.label}</AppText>
                      <AppText variant="label" color={r.accent}>
                        {r.value}
                      </AppText>
                    </View>
                    <ProgressBar
                      value={Math.max(0, Math.min(1, r.pct)) * 100}
                      accent={r.accent}
                      height={5}
                    />
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
