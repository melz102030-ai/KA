import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, Button, Card, Dot, Screen } from "@/components";
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

type Bubble = { from: "me" | "them"; text: string };

export default function Messages() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Bubble[]>>({});
  const [draft, setDraft] = useState("");

  const open = DEMO_MESSAGES.find((m) => m.id === openId) ?? null;

  const send = () => {
    if (!draft.trim() || !open) return;
    const text = draft.trim();
    setThreads((p) => ({ ...p, [open.id]: [...(p[open.id] ?? seed(open)), { from: "me", text }] }));
    setDraft("");
    setTimeout(() => {
      const reply =
        open.channel === "school"
          ? "شكرًا، سنكون بإذن الله."
          : open.channel === "carpool"
            ? "ممتاز، في انتظارك!"
            : "بارك الله فيك.";
      setThreads((p) => ({
        ...p,
        [open.id]: [...(p[open.id] ?? []), { from: "them", text: reply }],
      }));
    }, 1200);
  };

  if (open) {
    const ch = CHANNEL[open.channel] ?? CHANNEL.direct!;
    const bubbles = threads[open.id] ?? seed(open);
    return (
      <Screen scroll={false}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            paddingVertical: space.md,
            borderBottomWidth: 1,
            borderBottomColor: color.border,
          }}
        >
          <Button
            label="→"
            variant="ghost"
            accent={color.teal}
            size="sm"
            onPress={() => setOpenId(null)}
          />
          <AppText style={{ fontSize: 20 }}>{ch.icon}</AppText>
          <View>
            <AppText variant="heading">{open.senderName}</AppText>
            <AppText variant="label">{ch.label}</AppText>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: space.md, gap: space.sm }}
        >
          {bubbles.map((b, i) => (
            <View key={i} style={{ alignItems: b.from === "me" ? "flex-start" : "flex-end" }}>
              <View
                style={{
                  maxWidth: "80%",
                  padding: space.md,
                  borderRadius: radius.lg,
                  backgroundColor: b.from === "me" ? `${color.teal}22` : color.surfaceStrong,
                  borderWidth: 1,
                  borderColor: b.from === "me" ? `${color.teal}44` : color.border,
                }}
              >
                <AppText variant="body">{b.text}</AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            gap: space.sm,
            paddingVertical: space.md,
            borderTopWidth: 1,
            borderTopColor: color.border,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="اكتب ردك…"
            placeholderTextColor={color.textDim}
            style={{
              flex: 1,
              backgroundColor: color.surfaceStrong,
              borderColor: color.border,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: space.md,
              color: color.text,
              fontFamily: font.family.sans,
            }}
          />
          <Button label="إرسال" accent={color.teal} onPress={send} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.lg }}>
        💬 الرسائل
      </AppText>
      <View style={{ gap: space.sm }}>
        {DEMO_MESSAGES.map((m) => {
          const ch = CHANNEL[m.channel] ?? CHANNEL.direct!;
          return (
            <Card
              key={m.id}
              onPress={() => setOpenId(m.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            >
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
    </Screen>
  );
}

const seed = (m: { text: string }): Bubble[] => [{ from: "them", text: m.text }];
