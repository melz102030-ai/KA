import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, Button, Card, Dot, Icon, type IconName, Screen } from "@/components";
import { DEMO_MESSAGES } from "@/data/demo";
import { alpha, color, font, radius, space } from "@/theme";

type Tone = "info" | "primary" | "success" | "danger" | "neutral";
const CHANNEL: Record<string, { icon: IconName; tone: Tone; label: string }> = {
  school: { icon: "business-outline", tone: "info", label: "المدرسة" },
  teacher: { icon: "school-outline", tone: "primary", label: "معلم" },
  carpool: { icon: "car-outline", tone: "success", label: "التوصيل" },
  alert: { icon: "alert-circle-outline", tone: "danger", label: "تنبيه" },
  system: { icon: "notifications-outline", tone: "neutral", label: "النظام" },
  direct: { icon: "chatbubble-outline", tone: "primary", label: "محادثة" },
};
const TONE_FG: Record<Tone, string> = {
  info: color.info,
  primary: color.primary,
  success: color.success,
  danger: color.danger,
  neutral: color.textMuted,
};

const timeAgo = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  return h < 24 ? `قبل ${h} س` : "أمس";
};

type Bubble = { from: "me" | "them"; text: string };
const seed = (m: { text: string }): Bubble[] => [{ from: "them", text: m.text }];

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
            ? "تمام، في انتظارك."
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
        <View style={styles_threadHeader}>
          <Button
            label="رجوع"
            variant="ghost"
            size="sm"
            icon="chevron-forward"
            onPress={() => setOpenId(null)}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{open.senderName}</AppText>
            <AppText variant="caption">{ch.label}</AppText>
          </View>
          <Icon name={ch.icon} size={20} color={TONE_FG[ch.tone]} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: space.md, gap: space.sm }}
        >
          {bubbles.map((b, i) => (
            <View key={i} style={{ alignItems: b.from === "me" ? "flex-start" : "flex-end" }}>
              <View
                style={{
                  maxWidth: "82%",
                  padding: space.md,
                  borderRadius: radius.lg,
                  backgroundColor: b.from === "me" ? color.primary : color.surface,
                  borderWidth: b.from === "me" ? 0 : 1,
                  borderColor: color.border,
                }}
              >
                <AppText variant="body" color={b.from === "me" ? color.onPrimary : color.text}>
                  {b.text}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles_composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="اكتب رسالة…"
            placeholderTextColor={color.textDim}
            style={styles_input}
          />
          <Button label="إرسال" size="sm" icon="send" onPress={send} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.md }}>
        الرسائل
      </AppText>
      <View style={{ gap: space.sm }}>
        {DEMO_MESSAGES.map((m) => {
          const ch = CHANNEL[m.channel] ?? CHANNEL.direct!;
          const fg = TONE_FG[ch.tone];
          return (
            <Card key={m.id} onPress={() => setOpenId(m.id)} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={[styles_chip, { backgroundColor: alpha(fg, 0.1) }]}>
                  <Icon name={ch.icon} size={18} color={fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText variant="subtitle">{m.senderName}</AppText>
                    <AppText variant="caption">{timeAgo(m.at)}</AppText>
                  </View>
                  <AppText variant="label" numberOfLines={1}>
                    {m.text}
                  </AppText>
                </View>
                {m.system ? <Dot tone="danger" /> : null}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles_threadHeader = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: space.sm,
  paddingVertical: space.sm,
  borderBottomWidth: 1,
  borderBottomColor: color.border,
};
const styles_composer = {
  flexDirection: "row" as const,
  gap: space.sm,
  paddingVertical: space.md,
  borderTopWidth: 1,
  borderTopColor: color.border,
};
const styles_input = {
  flex: 1,
  backgroundColor: color.surface,
  borderColor: color.borderStrong,
  borderWidth: 1,
  borderRadius: radius.md,
  paddingHorizontal: space.md,
  color: color.text,
  fontFamily: font.family.regular,
  fontSize: font.size.md,
};
const styles_chip = {
  width: 40,
  height: 40,
  borderRadius: radius.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
