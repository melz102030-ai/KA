import { View } from "react-native";
import { AppText, Card, Dot, Screen } from "@/components";
import { DEMO_MESSAGES } from "@/data/demo";
import { color, font, radius, space } from "@/theme";

const CHANNEL: Record<string, { icon: string; tint: string; label: string }> = {
  school: { icon: "🏫", tint: color.blue, label: "المدرسة" },
  teacher: { icon: "👨‍🏫", tint: color.purple, label: "معلم" },
  carpool: { icon: "🚗", tint: color.green, label: "كاربول" },
  alert: { icon: "⚠️", tint: color.red, label: "تنبيه" },
  system: { icon: "🔔", tint: color.teal, label: "النظام" },
  direct: { icon: "💬", tint: color.teal, label: "محادثة" },
};

const timeAgo = (ms: number) => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `قبل ${mins} د`;
  const h = Math.round(mins / 60);
  return h < 24 ? `قبل ${h} س` : "أمس";
};

export default function Messages() {
  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.lg }}>
        💬 الرسائل
      </AppText>
      <View style={{ gap: space.sm }}>
        {DEMO_MESSAGES.map((m) => {
          const ch = CHANNEL[m.channel] ?? CHANNEL.direct!;
          return (
            <Card key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${ch.tint}22`,
                }}
              >
                <AppText style={{ fontSize: 22 }}>{ch.icon}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <AppText variant="heading">{m.senderName}</AppText>
                  <AppText style={{ color: color.textDim, fontSize: font.size.xs }}>
                    {timeAgo(m.at)}
                  </AppText>
                </View>
                <AppText variant="label" numberOfLines={1}>
                  {m.text}
                </AppText>
              </View>
              {m.system ? <Dot color={ch.tint} /> : null}
            </Card>
          );
        })}
      </View>
      <AppText variant="label" style={{ textAlign: "center", marginTop: space.xl }}>
        المحادثات المباشرة تُفعّل مع ربط المدرسة
      </AppText>
    </Screen>
  );
}
