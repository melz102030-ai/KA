import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Avatar, Button, Card, Dot, Pill, ProgressBar, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { alpha, color, radius, space } from "@/theme";

const DRIVERS = [
  {
    id: "P1",
    name: "أبو خالد الدوسري",
    emoji: "🧔",
    car: "GMC يوكون — أسود",
    plate: "ز ح ط 9012",
    seats: 3,
    rating: 5.0,
    trips: 78,
    distance: "0.5 كم",
    verified: true,
  },
  {
    id: "P2",
    name: "أم سارة العتيبي",
    emoji: "👩",
    car: "هونداي H1 — فضي",
    plate: "د ه و 5678",
    seats: 2,
    rating: 4.8,
    trips: 32,
    distance: "1.2 كم",
    verified: true,
  },
  {
    id: "P3",
    name: "أبو فيصل الشمري",
    emoji: "🧑",
    car: "تويوتا لاند كروزر",
    plate: "ي ك ل 3456",
    seats: 4,
    rating: 4.7,
    trips: 19,
    distance: "2.1 كم",
    verified: false,
  },
];

type Step = "kids" | "list" | "request" | "active";
type Phase = "sending" | "waiting" | "accepted";

export default function Carpool() {
  const { data: kids } = useKids();
  const [tab, setTab] = useState<"find" | "offer">("find");
  const [step, setStep] = useState<Step>("kids");
  const [sel, setSel] = useState<string[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("sending");
  const [elapsed, setElapsed] = useState(0);

  const driver = DRIVERS.find((d) => d.id === driverId) ?? null;
  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const reset = () => {
    setStep("kids");
    setSel([]);
    setDriverId(null);
    setPhase("sending");
    setElapsed(0);
  };

  // request simulation
  useEffect(() => {
    if (step !== "request") return;
    setPhase("sending");
    const a = setTimeout(() => setPhase("waiting"), 1500);
    const b = setTimeout(() => setPhase("accepted"), 4000);
    const c = setTimeout(() => setStep("active"), 6000);
    return () => [a, b, c].forEach(clearTimeout);
  }, [step]);

  // active trip progress
  useEffect(() => {
    if (step !== "active") return;
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, 60)), 1000);
    return () => clearInterval(t);
  }, [step]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: space.sm, marginVertical: space.md }}>
        {(["find", "offer"] as const).map((t) => (
          <Button
            key={t}
            label={t === "find" ? "🔍 ابحث عن كاربول" : "🚗 أنا رايح"}
            variant={tab === t ? "solid" : "outline"}
            accent={color.teal}
            onPress={() => {
              setTab(t);
              reset();
            }}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {tab === "offer" && <Offer />}

      {tab === "find" && step === "kids" && (
        <View>
          <AppText variant="heading">من تريد توصيله؟</AppText>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {kids.map((k) => {
              const on = sel.includes(k.id);
              return (
                <Card
                  key={k.id}
                  accent={on ? color.teal : undefined}
                  onPress={() => toggle(k.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
                >
                  <Avatar
                    emoji={k.photoEmoji}
                    size={44}
                    accent={on ? color.teal : color.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading">{k.name}</AppText>
                    <AppText variant="label">{k.gradeLabel}</AppText>
                  </View>
                  {on && <AppText color={color.teal}>✓</AppText>}
                </Card>
              );
            })}
          </View>
          <Button
            label="بحث عن كاربول 🔍"
            accent={color.teal}
            disabled={sel.length === 0}
            onPress={() => setStep("list")}
            style={{ marginTop: space.lg }}
          />
        </View>
      )}

      {tab === "find" && step === "list" && (
        <View style={{ gap: space.sm }}>
          <AppText variant="heading">أولياء الأمور القريبون 📍</AppText>
          {DRIVERS.map((d) => (
            <Card
              key={d.id}
              accent={driverId === d.id ? color.teal : d.verified ? color.green : undefined}
              onPress={() => setDriverId(d.id)}
              style={{ gap: space.sm }}
            >
              <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
                <Avatar
                  emoji={d.emoji}
                  size={48}
                  accent={d.verified ? color.green : color.yellow}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{d.name}</AppText>
                  <AppText variant="label" color={color.yellow}>
                    {"★".repeat(Math.round(d.rating))} {d.rating}
                  </AppText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText variant="label" color={color.teal}>
                    📍{d.distance}
                  </AppText>
                  <AppText variant="label" color={d.verified ? color.green : color.yellow}>
                    {d.verified ? "✓ موثّق" : "⚠️ قيد التحقق"}
                  </AppText>
                </View>
              </View>
              <AppText variant="label">
                🚗 {d.car} · 💺 {d.seats} مقاعد · 🔄 {d.trips} رحلة
              </AppText>
            </Card>
          ))}
          <Button
            label="طلب الانضمام ←"
            accent={color.teal}
            disabled={!driverId}
            onPress={() => setStep("request")}
            style={{ marginTop: space.sm }}
          />
          <Button
            label="→ رجوع"
            variant="ghost"
            accent={color.textMuted}
            onPress={() => setStep("kids")}
          />
        </View>
      )}

      {tab === "find" && step === "request" && driver && (
        <Card accent={color.teal} glow style={{ alignItems: "center", paddingVertical: space.xl }}>
          <AppText style={{ fontSize: 44 }}>
            {phase === "accepted" ? "🎉" : phase === "waiting" ? "⏳" : "📤"}
          </AppText>
          <AppText variant="heading" color={color.teal} style={{ marginTop: space.sm }}>
            {phase === "sending"
              ? "جاري إرسال الطلب…"
              : phase === "waiting"
                ? `${driver.name} ينظر في الطلب…`
                : "تم قبول الطلب!"}
          </AppText>
          <AppText variant="label" style={{ marginTop: space.xs }}>
            {kids
              .filter((k) => sel.includes(k.id))
              .map((k) => k.name.split(" ")[0])
              .join(" + ")}
          </AppText>
        </Card>
      )}

      {tab === "find" && step === "active" && driver && (
        <Active driver={driver} elapsed={elapsed} onEnd={reset} />
      )}
    </Screen>
  );
}

function Active({
  driver,
  elapsed,
  onEnd,
}: {
  driver: (typeof DRIVERS)[number];
  elapsed: number;
  onEnd: () => void;
}) {
  const prog = (elapsed / 60) * 100;
  const eta = Math.max(0, 14 - Math.floor(elapsed / 4));
  return (
    <View style={{ gap: space.md }}>
      <Card
        accent={color.green}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      >
        <Dot color={color.green} />
        <AppText variant="heading" color={color.green}>
          الكاربول في الطريق! 🚗
        </AppText>
      </Card>

      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            marginBottom: space.md,
          }}
        >
          <Avatar emoji={driver.emoji} size={48} accent={color.green} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{driver.name}</AppText>
            <AppText variant="label">{driver.car}</AppText>
          </View>
          <Pill label={driver.plate} accent={color.teal} />
        </View>
        <ProgressBar value={prog} accent={color.green} height={8} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <AppText variant="label">المنزل</AppText>
          <AppText variant="label" color={color.yellow}>
            ETA {eta} دقيقة
          </AppText>
          <AppText variant="label">المدرسة</AppText>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button label="📞 اتصال" accent={color.green} style={{ flex: 1 }} />
        <Button label="📍 موقع مباشر" accent={color.teal} variant="outline" style={{ flex: 1 }} />
      </View>

      {eta === 0 && (
        <Button label="🎉 وصل الأطفال بأمان — إغلاق" accent={color.green} onPress={onEnd} />
      )}
    </View>
  );
}

function Offer() {
  const [seats, setSeats] = useState(2);
  const [dir, setDir] = useState<"both" | "go" | "back">("both");
  const [posted, setPosted] = useState(false);

  if (posted) {
    return (
      <View style={{ gap: space.md }}>
        <Card accent={color.green} style={{ alignItems: "center", paddingVertical: space.xl }}>
          <AppText style={{ fontSize: 44 }}>✅</AppText>
          <AppText variant="heading" color={color.green}>
            رحلتك منشورة!
          </AppText>
          <AppText variant="label">أولياء الأمور المجاورون يمكنهم طلب الانضمام</AppText>
        </Card>
        <Card accent={color.yellow}>
          <AppText variant="heading" color={color.yellow}>
            🔔 طلب انضمام جديد
          </AppText>
          <AppText variant="label" style={{ marginVertical: space.sm }}>
            أبو عمر القحطاني · 0.9 كم · موثّق ✓ — عمر (ثالث متوسط)
          </AppText>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="❌ رفض" variant="outline" accent={color.red} style={{ flex: 1 }} />
            <Button label="✅ قبول" accent={color.green} style={{ flex: 2 }} />
          </View>
        </Card>
        <Button
          label="إلغاء نشر الرحلة"
          variant="outline"
          accent={color.red}
          onPress={() => setPosted(false)}
        />
      </View>
    );
  }

  return (
    <View>
      <AppText variant="heading">أعلن رحلتك 🚗</AppText>

      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        كم مقعدًا فارغًا؟
      </AppText>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Card
            key={n}
            accent={seats === n ? color.green : undefined}
            onPress={() => setSeats(n)}
            style={{
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <AppText variant="heading" color={seats === n ? color.green : color.textMuted}>
              {n}
            </AppText>
          </Card>
        ))}
      </View>

      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        اتجاه الرحلة
      </AppText>
      <View style={{ gap: space.sm }}>
        {(
          [
            ["both", "ذهاب وإياب 🔄"],
            ["go", "ذهاب فقط →"],
            ["back", "إياب فقط ←"],
          ] as const
        ).map(([id, label]) => (
          <Card
            key={id}
            accent={dir === id ? color.green : undefined}
            onPress={() => setDir(id)}
            style={{
              paddingVertical: space.md,
              borderRadius: radius.md,
              backgroundColor: dir === id ? alpha(color.green, 0.12) : color.surface,
            }}
          >
            <AppText variant="heading" color={dir === id ? color.green : color.textMuted}>
              {label}
            </AppText>
          </Card>
        ))}
      </View>

      <Button
        label="🚀 نشر الرحلة"
        accent={color.green}
        onPress={() => setPosted(true)}
        style={{ marginTop: space.lg }}
      />
    </View>
  );
}
