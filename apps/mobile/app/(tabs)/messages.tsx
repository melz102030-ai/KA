import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import {
  AppText,
  Badge,
  Button,
  Card,
  Dot,
  EmptyState,
  Icon,
  type IconName,
  Screen,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useMessages, useThreads, DEMO_MESSAGES } from "@/data/hooks";
import { markThreadRead, sendMessage } from "@/data/mutations";
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
const FG: Record<Tone, string> = {
  info: color.info,
  primary: color.primary,
  success: color.success,
  danger: color.danger,
  neutral: color.textMuted,
};
const timeAgo = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  return h < 24 ? `قبل ${h} س` : "أمس";
};

export default function Messages() {
  const { isDemo } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  if (openId) return <Thread threadId={openId} onBack={() => setOpenId(null)} />;
  return isDemo ? <DemoList onOpen={setOpenId} /> : <RealList onOpen={setOpenId} />;
}

/* ── Real threads ──────────────────────────────────────────────────────── */

function RealList({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useAuth();
  const { data: threads, loading } = useThreads();

  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.md }}>
        الرسائل
      </AppText>
      {!loading && threads.length === 0 && (
        <EmptyState
          icon="chatbubbles-outline"
          title="لا توجد محادثات"
          subtitle="تبدأ المحادثات مع المدرسة وأولياء أمور التوصيل عند ربط مدرسة."
        />
      )}
      <View style={{ gap: space.sm }}>
        {threads.map((t) => {
          const ch = CHANNEL[t.channel] ?? CHANNEL.direct!;
          const unread = (user && t.unread?.[user.uid]) || 0;
          return (
            <Card key={t.id} onPress={() => onOpen(t.id)} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={[styles_chip, { backgroundColor: alpha(FG[ch.tone], 0.1) }]}>
                  <Icon name={ch.icon} size={18} color={FG[ch.tone]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText variant="subtitle">{t.title ?? ch.label}</AppText>
                    <AppText variant="caption">
                      {t.lastMessage ? timeAgo(t.lastMessage.at) : ""}
                    </AppText>
                  </View>
                  <AppText variant="label" numberOfLines={1}>
                    {t.lastMessage?.text ?? "—"}
                  </AppText>
                </View>
                {unread > 0 ? <Badge label={String(unread)} tone="primary" /> : null}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Thread({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const { user } = useAuth();
  const demo = threadId.startsWith("demo:");
  const { data: liveMsgs } = useMessages(demo ? undefined : threadId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const demoMsg = demo ? DEMO_MESSAGES.find((m) => `demo:${m.id}` === threadId) : undefined;
  const msgs = demo
    ? demoMsg
      ? [{ id: demoMsg.id, senderUid: "them", senderName: demoMsg.senderName, text: demoMsg.text }]
      : []
    : liveMsgs;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || demo) return;
    setDraft("");
    setSending(true);
    try {
      await sendMessage({ threadId, text });
    } finally {
      setSending(false);
      if (user) markThreadRead(threadId, user.uid).catch(() => {});
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles_threadHeader}>
        <Button label="رجوع" variant="ghost" size="sm" icon="chevron-forward" onPress={onBack} />
        <AppText variant="subtitle" style={{ flex: 1 }}>
          المحادثة
        </AppText>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: space.md, gap: space.sm }}
      >
        {msgs.map((m) => {
          const mine = m.senderUid === user?.uid;
          return (
            <View key={m.id} style={{ alignItems: mine ? "flex-start" : "flex-end" }}>
              <View
                style={{
                  maxWidth: "82%",
                  padding: space.md,
                  borderRadius: radius.lg,
                  backgroundColor: mine ? color.primary : color.surface,
                  borderWidth: mine ? 0 : 1,
                  borderColor: color.border,
                }}
              >
                {!mine && (
                  <AppText variant="caption" color={color.primary}>
                    {m.senderName}
                  </AppText>
                )}
                <AppText variant="body" color={mine ? color.onPrimary : color.text}>
                  {m.text}
                </AppText>
              </View>
            </View>
          );
        })}
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
        <Button label="إرسال" size="sm" icon="send" loading={sending} onPress={send} />
      </View>
    </Screen>
  );
}

/* ── Demo list (offline preview) ──────────────────────────────────────── */

function DemoList({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <Screen>
      <AppText variant="title" style={{ paddingVertical: space.md }}>
        الرسائل
      </AppText>
      <View style={{ gap: space.sm }}>
        {DEMO_MESSAGES.map((m) => {
          const ch = CHANNEL[m.channel] ?? CHANNEL.direct!;
          return (
            <Card key={m.id} onPress={() => onOpen(`demo:${m.id}`)} padding={space.md}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={[styles_chip, { backgroundColor: alpha(FG[ch.tone], 0.1) }]}>
                  <Icon name={ch.icon} size={18} color={FG[ch.tone]} />
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
      <AppText variant="caption" style={{ textAlign: "center", marginTop: space.xl }}>
        وضع تجريبي — المحادثات الحقيقية تُفعّل بعد ربط مدرسة
      </AppText>
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
