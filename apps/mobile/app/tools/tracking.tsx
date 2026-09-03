import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  type IconName,
  ProgressBar,
  Screen,
} from "@/components";
import { useKids } from "@/data/hooks";
import { color, font, space } from "@/theme";

const SPOTS: { id: string; label: string; icon: IconName }[] = [
  { id: "gate_main", label: "البوابة الرئيسية", icon: "enter-outline" },
  { id: "gate_side", label: "البوابة الجانبية", icon: "enter-outline" },
  { id: "parking", label: "موقف السيارات", icon: "car-outline" },
];
const TOTAL = 90;

export default function Tracking() {
  const { data: kids } = useKids();
  const [spot, setSpot] = useState("gate_main");
  const [phase, setPhase] = useState<"idle" | "tracking" | "arrived">("idle");
  const [elapsed, setElapsed] = useState(0);
  const r = SPOTS.find((s) => s.id === spot)!;

  useEffect(() => {
    if (phase !== "tracking") return;
    const t = setInterval(() => {
      setElapsed((e) => {
        if (e >= TOTAL) {
          clearInterval(t);
          setPhase("arrived");
          return e;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (phase === "arrived") {
    return (
      <Screen>
        <View style={{ alignItems: "center", paddingTop: space.xxxl, gap: space.sm }}>
          <View style={styles_check}>
            <Icon name="checkmark" size={30} color={color.success} />
          </View>
          <AppText variant="title" color={color.success}>
            وصل الطالب
          </AppText>
          <AppText variant="label">{r.label}</AppText>
          <Button
            label="طلب خروج جديد"
            onPress={() => {
              setPhase("idle");
              setElapsed(0);
            }}
            style={{ marginTop: space.xl, alignSelf: "stretch" }}
          />
        </View>
      </Screen>
    );
  }

  if (phase === "tracking") {
    const left = Math.max(0, TOTAL - elapsed);
    return (
      <Screen>
        <Card style={{ marginTop: space.md, gap: space.sm }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <AppText variant="subtitle">الطالب في طريقه</AppText>
            <Badge label="مباشر" tone="danger" icon="ellipse" />
          </View>
          <ProgressBar value={(elapsed / TOTAL) * 100} height={8} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="label">الفصل</AppText>
            <AppText variant="label" color={color.primary}>
              {r.label}
            </AppText>
          </View>
        </Card>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: space.md,
          }}
        >
          <AppText variant="label">الوقت المتبقي</AppText>
          <AppText style={{ fontFamily: font.family.mono, fontSize: 26, color: color.primary }}>
            {left}ث
          </AppText>
        </View>

        {kids[0] && (
          <Card
            padding={space.md}
            style={{
              marginTop: space.md,
              flexDirection: "row",
              gap: space.md,
              alignItems: "center",
            }}
          >
            <Avatar name={kids[0].name} size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{kids[0].name.split(" ")[0]}</AppText>
              <AppText variant="label" color={color.primary}>
                يسير في الممر الرئيسي
              </AppText>
            </View>
          </Card>
        )}

        <Button
          label="إلغاء الطلب"
          variant="danger"
          onPress={() => {
            setPhase("idle");
            setElapsed(0);
          }}
          style={{ marginTop: space.md }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        أين تنتظر؟
      </AppText>
      <View style={{ gap: space.sm }}>
        {SPOTS.map((s) => {
          const active = spot === s.id;
          return (
            <Card
              key={s.id}
              onPress={() => setSpot(s.id)}
              padding={space.md}
              style={
                active
                  ? { borderColor: color.primary, backgroundColor: color.primarySoft }
                  : undefined
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Icon name={s.icon} size={20} color={active ? color.primary : color.textMuted} />
                <AppText variant="subtitle" style={{ flex: 1 }}>
                  {s.label}
                </AppText>
                {active && <Icon name="checkmark-circle" size={20} color={color.primary} />}
              </View>
            </Card>
          );
        })}
      </View>
      <Button
        label="طلب خروج الطالب"
        icon="paper-plane-outline"
        onPress={() => setPhase("tracking")}
        style={{ marginTop: space.lg }}
      />
    </Screen>
  );
}

const styles_check = {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: color.successSoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
