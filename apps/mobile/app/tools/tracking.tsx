import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Pill, ProgressBar, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { alpha, color, font, radius, space } from "@/theme";

const SPOTS = [
  { id: "gate_main", label: "البوابة الرئيسية", icon: "🚗", accent: color.green },
  { id: "gate_side", label: "البوابة الجانبية", icon: "🚙", accent: color.teal },
  { id: "parking", label: "موقف السيارات", icon: "🅿️", accent: color.yellow },
] as const;

const TOTAL = 90; // seconds

export default function Tracking() {
  const { data: kids } = useKids();
  const [spot, setSpot] = useState<(typeof SPOTS)[number]["id"]>("gate_main");
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
        <View style={{ alignItems: "center", paddingTop: space.xxl }}>
          <AppText style={{ fontSize: 64 }}>🎉</AppText>
          <AppText variant="title" color={color.green}>
            وصل الطالب!
          </AppText>
          <AppText variant="label">
            {r.icon} {r.label}
          </AppText>
          <Button
            label="طلب خروج جديد"
            accent={color.teal}
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
        <Card accent={r.accent} style={{ marginTop: space.md, gap: space.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="heading">الطالب في طريقه</AppText>
            <Pill label="🔴 مباشر" accent={r.accent} />
          </View>
          <ProgressBar value={(elapsed / TOTAL) * 100} accent={r.accent} height={8} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="label">الفصل</AppText>
            <AppText variant="label" color={r.accent}>
              {r.icon} {r.label}
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
          <AppText style={{ fontFamily: font.family.mono, fontSize: 28, color: r.accent }}>
            {left}ث
          </AppText>
        </View>

        {kids[0] && (
          <Card
            style={{
              marginTop: space.md,
              flexDirection: "row",
              gap: space.md,
              alignItems: "center",
            }}
          >
            <AppText style={{ fontSize: 28 }}>{kids[0].photoEmoji}</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{kids[0].name.split(" ")[0]}</AppText>
              <AppText variant="label" color={color.teal}>
                📍 يسير في الممر الرئيسي
              </AppText>
            </View>
          </Card>
        )}

        <Button
          label="إلغاء"
          accent={color.red}
          variant="outline"
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
              accent={active ? s.accent : undefined}
              onPress={() => setSpot(s.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: alpha(s.accent, 0.18),
                }}
              >
                <AppText style={{ fontSize: 22 }}>{s.icon}</AppText>
              </View>
              <AppText variant="heading" style={{ flex: 1 }}>
                {s.label}
              </AppText>
              {active && <AppText color={s.accent}>✓</AppText>}
            </Card>
          );
        })}
      </View>
      <Button
        label="📲 طلب خروج الطالب"
        accent={color.teal}
        onPress={() => setPhase("tracking")}
        style={{ marginTop: space.lg }}
      />
    </Screen>
  );
}
