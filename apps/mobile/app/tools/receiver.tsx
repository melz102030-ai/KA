import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Card, Dot, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { color, font, space } from "@/theme";

type LogLine = { id: number; text: string; kind: "data" | "alert" | "system" };

export default function Receiver() {
  const { data: kids } = useKids();
  const [packets, setPackets] = useState(128);
  const [log, setLog] = useState<LogLine[]>([
    { id: 1, kind: "system", text: "WebSocket server — الساعات متصلة" },
  ]);
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
            kind: "data" as const,
            text: `[${(k?.akbadnaId ?? "AKB-XXXX").slice(4, 8)}] ${time} نبض:${Math.round(
              k?.live.heartRate ?? 80,
            )} بطارية:${Math.round(k?.live.batteryPct ?? 90)}%`,
          },
        ].slice(-40),
      );
    }, 2500);
    return () => clearInterval(t);
  }, [kids]);

  const tint = { data: color.teal, alert: color.red, system: color.textMuted };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
          {[
            { l: "متصل", v: `${kids.length}/${kids.length}`, c: color.green },
            { l: "حزم", v: String(packets), c: color.teal },
            { l: "SOS", v: "0", c: color.textMuted },
          ].map((s) => (
            <Card key={s.l} style={{ flex: 1, alignItems: "center", paddingVertical: space.sm }}>
              <AppText style={{ fontFamily: font.family.mono, fontSize: 20, color: s.c }}>
                {s.v}
              </AppText>
              <AppText variant="label">{s.l}</AppText>
            </Card>
          ))}
        </View>

        {kids.map((k) => (
          <Card
            key={k.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              marginBottom: space.sm,
            }}
          >
            <AppText style={{ fontSize: 22 }}>{k.photoEmoji}</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{k.name.split(" ")[0]}</AppText>
              <AppText variant="label">
                ❤️{Math.round(k.live.heartRate ?? 0)} · 🔋{Math.round(k.live.batteryPct ?? 0)}%
              </AppText>
            </View>
            <Dot color={k.live.watchOnline ? color.green : color.textDim} />
          </Card>
        ))}
      </View>

      <View
        style={{
          flex: 1,
          marginTop: space.sm,
          marginHorizontal: space.lg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: color.border,
          backgroundColor: "#050510",
          overflow: "hidden",
        }}
      >
        <View style={{ padding: space.sm, borderBottomWidth: 1, borderBottomColor: color.border }}>
          <AppText style={{ fontFamily: font.family.mono, fontSize: 10, color: color.textMuted }}>
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
                color: tint[l.kind],
                marginBottom: 3,
              }}
            >
              {l.text}
            </AppText>
          ))}
        </ScrollView>
      </View>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}
