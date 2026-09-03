import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Avatar, Badge, Button, Card, Dot, Icon, ProgressBar, Screen } from "@/components";
import { useKids } from "@/data/hooks";
import { color, space } from "@/theme";

const DRIVERS = [
  {
    id: "P1",
    name: "أبو خالد الدوسري",
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

  useEffect(() => {
    if (step !== "request") return;
    setPhase("sending");
    const a = setTimeout(() => setPhase("waiting"), 1500);
    const b = setTimeout(() => setPhase("accepted"), 4000);
    const c = setTimeout(() => setStep("active"), 6000);
    return () => [a, b, c].forEach(clearTimeout);
  }, [step]);

  useEffect(() => {
    if (step !== "active") return;
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, 60)), 1000);
    return () => clearInterval(t);
  }, [step]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: space.sm, marginVertical: space.md }}>
        {(
          [
            ["find", "البحث عن توصيلة"],
            ["offer", "عرض توصيلة"],
          ] as const
        ).map(([t, label]) => (
          <Button
            key={t}
            label={label}
            variant={tab === t ? "primary" : "secondary"}
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
          <AppText variant="subtitle">من تريد توصيله؟</AppText>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {kids.map((k) => {
              const on = sel.includes(k.id);
              return (
                <Card
                  key={k.id}
                  onPress={() => toggle(k.id)}
                  padding={space.md}
                  style={
                    on
                      ? { borderColor: color.primary, backgroundColor: color.primarySoft }
                      : undefined
                  }
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <Avatar name={k.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle">{k.name}</AppText>
                      <AppText variant="label">{k.gradeLabel}</AppText>
                    </View>
                    <Icon
                      name={on ? "checkbox" : "square-outline"}
                      size={20}
                      color={on ? color.primary : color.textDim}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
          <Button
            label="بحث عن توصيلة"
            icon="search-outline"
            disabled={sel.length === 0}
            onPress={() => setStep("list")}
            style={{ marginTop: space.lg }}
          />
        </View>
      )}

      {tab === "find" && step === "list" && (
        <View style={{ gap: space.sm }}>
          <AppText variant="subtitle">أولياء الأمور القريبون</AppText>
          {DRIVERS.map((d) => {
            const active = driverId === d.id;
            return (
              <Card
                key={d.id}
                onPress={() => setDriverId(d.id)}
                style={active ? { borderColor: color.primary } : undefined}
              >
                <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
                  <Avatar name={d.name} size={44} tone={d.verified ? "success" : "warning"} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{d.name}</AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="star" size={12} color={color.warning} />
                      <AppText variant="label">
                        {d.rating} · {d.trips} رحلة
                      </AppText>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <AppText variant="label" color={color.primary}>
                      {d.distance}
                    </AppText>
                    <Badge
                      label={d.verified ? "موثّق" : "قيد التحقق"}
                      tone={d.verified ? "success" : "warning"}
                    />
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.sm,
                    marginTop: space.sm,
                  }}
                >
                  <Icon name="car-outline" size={14} color={color.textMuted} />
                  <AppText variant="label" style={{ flex: 1 }}>
                    {d.car} · {d.seats} مقاعد
                  </AppText>
                </View>
              </Card>
            );
          })}
          <Button
            label="طلب الانضمام"
            disabled={!driverId}
            onPress={() => setStep("request")}
            style={{ marginTop: space.sm }}
          />
          <Button
            label="رجوع"
            variant="ghost"
            icon="chevron-forward"
            onPress={() => setStep("kids")}
          />
        </View>
      )}

      {tab === "find" && step === "request" && driver && (
        <Card style={{ alignItems: "center", paddingVertical: space.xl }}>
          <View style={styles_pulse}>
            <Icon
              name={
                phase === "accepted"
                  ? "checkmark"
                  : phase === "waiting"
                    ? "hourglass-outline"
                    : "paper-plane-outline"
              }
              size={24}
              color={color.primary}
            />
          </View>
          <AppText variant="subtitle" style={{ marginTop: space.md }}>
            {phase === "sending"
              ? "جارٍ إرسال الطلب…"
              : phase === "waiting"
                ? `${driver.name} ينظر في الطلب…`
                : "تم قبول الطلب"}
          </AppText>
          <AppText variant="label" style={{ marginTop: space.xs }}>
            {kids
              .filter((k) => sel.includes(k.id))
              .map((k) => k.name.split(" ")[0])
              .join(" و")}
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
        padding={space.md}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      >
        <Dot tone="success" />
        <AppText variant="subtitle" color={color.success}>
          التوصيلة في الطريق
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
          <Avatar name={driver.name} size={44} tone="success" />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{driver.name}</AppText>
            <AppText variant="label">{driver.car}</AppText>
          </View>
          <Badge label={driver.plate} tone="primary" />
        </View>
        <ProgressBar value={prog} tone="success" height={8} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <AppText variant="label">المنزل</AppText>
          <AppText variant="label" color={color.primary}>
            الوصول خلال {eta} دقيقة
          </AppText>
          <AppText variant="label">المدرسة</AppText>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button label="اتصال" icon="call-outline" style={{ flex: 1 }} />
        <Button
          label="الموقع المباشر"
          variant="secondary"
          icon="location-outline"
          style={{ flex: 1 }}
        />
      </View>

      {eta === 0 && <Button label="وصل الأطفال بأمان — إغلاق" onPress={onEnd} />}
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
        <Card style={{ alignItems: "center", paddingVertical: space.xl }}>
          <View style={styles_pulse}>
            <Icon name="checkmark" size={24} color={color.primary} />
          </View>
          <AppText variant="subtitle" style={{ marginTop: space.md }}>
            تم نشر رحلتك
          </AppText>
          <AppText variant="label">يمكن لأولياء الأمور المجاورين طلب الانضمام</AppText>
        </Card>
        <Card>
          <AppText variant="subtitle">طلب انضمام جديد</AppText>
          <AppText variant="label" style={{ marginVertical: space.sm }}>
            أبو عمر القحطاني · 0.9 كم · موثّق — عمر (ثالث متوسط)
          </AppText>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="رفض" variant="danger" style={{ flex: 1 }} />
            <Button label="قبول" style={{ flex: 2 }} />
          </View>
        </Card>
        <Button label="إلغاء نشر الرحلة" variant="secondary" onPress={() => setPosted(false)} />
      </View>
    );
  }

  return (
    <View>
      <AppText variant="subtitle">تفاصيل رحلتك</AppText>

      <AppText variant="label" style={{ marginTop: space.md, marginBottom: space.sm }}>
        المقاعد المتاحة
      </AppText>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            label={String(n)}
            size="sm"
            variant={seats === n ? "primary" : "secondary"}
            onPress={() => setSeats(n)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      <AppText variant="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        اتجاه الرحلة
      </AppText>
      <View style={{ gap: space.sm }}>
        {(
          [
            ["both", "ذهاب وإياب"],
            ["go", "ذهاب فقط"],
            ["back", "إياب فقط"],
          ] as const
        ).map(([id, label]) => (
          <Card
            key={id}
            onPress={() => setDir(id)}
            padding={space.md}
            style={
              dir === id
                ? { borderColor: color.primary, backgroundColor: color.primarySoft }
                : undefined
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Icon
                name={dir === id ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={dir === id ? color.primary : color.textDim}
              />
              <AppText variant="subtitle">{label}</AppText>
            </View>
          </Card>
        ))}
      </View>

      <Button
        label="نشر الرحلة"
        icon="megaphone-outline"
        onPress={() => setPosted(true)}
        style={{ marginTop: space.lg }}
      />
    </View>
  );
}

const styles_pulse = {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: color.primarySoft,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
