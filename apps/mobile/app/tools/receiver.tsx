import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Avatar, Card, Dot, Icon, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { color, font, radius, space } from "@/theme";

type LogLine = { id: number; text: string };

export default function Receiver() {
  const { data: kids } = useKids();
  const [packets, setPackets] = useState(128);
  const [log, setLog] = useState<LogLine[]>([{ id: 1, text: "WebSocket server — الساعات متصلة" }]);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setPackets((p) => p + Math.ceil(Math.random() * 3));
      const k = kids[Math.floor(Math.random() * Math.max(1, kids.length))];
      const time = new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLog((prev) =>
        [
          ...prev,
          {
            id: Date.now(),
            text: `[${(k?.akbadnaId ?? "AKB-XXXX").slice(4, 8)}] ${time}  HR ${Math.round(
              k?.live.heartRate ?? 80,
            )}  BAT ${Math.round(k?.live.batteryPct ?? 90)}%`,
          },
        ].slice(-40),
      );
    }, 2500);
    return () => clearInterval(t);
  }, [kids]);

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
          {[
            { l: "متصل", v: `${kids.length}/${kids.length}`, icon: "wifi-outline" as const },
            { l: "حزم", v: String(packets), icon: "cube-outline" as const },
            { l: "استغاثات", v: "0", icon: "warning-outline" as const },
          ].map((s) => (
            <View key={s.l} style={styles_stat}>
              <Icon name={s.icon} size={15} color={color.textMuted} />
              <AppText style={{ fontFamily: font.family.mono, fontSize: 18, color: color.text }}>
                {s.v}
              </AppText>
              <AppText variant="caption">{s.l}</AppText>
            </View>
          ))}
        </View>

        {kids.map((k) => (
          <Card
            key={k.id}
            padding={space.md}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              marginBottom: space.sm,
            }}
          >
            <Avatar name={k.name} size={34} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{k.name.split(" ")[0]}</AppText>
              <AppText variant="label">
                {Math.round(k.live.heartRate ?? 0)} bpm · {Math.round(k.live.batteryPct ?? 0)}%
              </AppText>
            </View>
            <Dot tone={k.live.watchOnline ? "success" : "neutral"} />
          </Card>
        ))}
      </View>

      <View style={styles_console}>
        <View style={{ padding: space.sm, borderBottomWidth: 1, borderBottomColor: "#1F2A33" }}>
          <AppText style={{ fontFamily: font.family.mono, fontSize: 10, color: "#7C8B99" }}>
            LIVE LOG
          </AppText>
        </View>
        <ScrollView
          ref={scroller}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: space.sm }}
        >
          {log.map((l) => (
            <AppText
              key={l.id}
              style={{
                fontFamily: font.family.mono,
                fontSize: 10,
                color: "#8FE3C6",
                marginBottom: 3,
              }}
            >
              {l.text}
            </AppText>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles_stat = {
  flex: 1,
  alignItems: "center" as const,
  backgroundColor: color.surface,
  borderWidth: 1,
  borderColor: color.border,
  borderRadius: radius.md,
  paddingVertical: space.sm,
  gap: 2,
};
const styles_console = {
  flex: 1,
  margin: space.lg,
  marginTop: space.sm,
  borderRadius: radius.md,
  overflow: "hidden" as const,
  backgroundColor: "#0C1418",
  borderWidth: 1,
  borderColor: "#1F2A33",
};
