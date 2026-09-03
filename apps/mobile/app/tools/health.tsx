import { View } from "react-native";
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Icon,
  type IconName,
  ProgressBar,
  Screen,
} from "@/components";
import { useKids } from "@/data/hooks";
import { vitalsTone } from "@/lib/time";
import { color, space } from "@/theme";

export default function HealthScreen() {
  const { data: kids } = useKids();

  return (
    <Screen>
      <View style={{ gap: space.md, paddingTop: space.md }}>
        {kids.map((k) => {
          const hr = k.live.heartRate ?? 0;
          const temp = k.live.skinTempC ?? 0;
          const batt = k.live.batteryPct ?? 0;
          const steps = k.live.steps ?? 0;
          const rows: {
            icon: IconName;
            label: string;
            value: string;
            pct: number;
            tone: "success" | "warning" | "danger" | "primary";
          }[] = [
            {
              icon: "heart-outline",
              label: "نبضات القلب",
              value: `${Math.round(hr)} bpm`,
              pct: hr / 150,
              tone: vitalsTone.heartRate(hr),
            },
            {
              icon: "thermometer-outline",
              label: "حرارة الجلد",
              value: `${temp.toFixed(1)}°`,
              pct: (temp - 34) / 6,
              tone: "primary",
            },
            {
              icon: "battery-half-outline",
              label: "البطارية",
              value: `${Math.round(batt)}%`,
              pct: batt / 100,
              tone: vitalsTone.battery(batt),
            },
            {
              icon: "footsteps-outline",
              label: "الخطوات اليوم",
              value: `${steps}`,
              pct: steps / 8000,
              tone: "primary",
            },
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
                <Avatar name={k.name} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{k.name}</AppText>
                  <AppText variant="label">{k.gradeLabel}</AppText>
                </View>
                <Badge
                  label={k.live.watchOnline ? "متصلة" : "غير متصلة"}
                  tone={k.live.watchOnline ? "success" : "neutral"}
                />
              </View>
              <View style={{ gap: space.md }}>
                {rows.map((r) => (
                  <View key={r.label} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      <Icon name={r.icon} size={15} color={color.textMuted} />
                      <AppText variant="label" style={{ flex: 1 }}>
                        {r.label}
                      </AppText>
                      <AppText variant="subtitle">{r.value}</AppText>
                    </View>
                    <ProgressBar
                      value={Math.max(0, Math.min(1, r.pct)) * 100}
                      tone={r.tone}
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
