import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import type { CarpoolTrip } from "@akbadna/core";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Dot,
  EmptyState,
  Field,
  Icon,
  ProgressBar,
  Screen,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useCarpoolRequests, useCarpoolTrips, useKids, useMemberships } from "@/data/hooks";
import { decideCarpoolRequest, offerCarpoolTrip, requestCarpoolJoin } from "@/data/mutations";
import { color, space } from "@/theme";

const DIR_LABEL: Record<string, string> = {
  to_school: "ذهاب",
  from_school: "إياب",
  round_trip: "ذهاب وإياب",
};

export default function Carpool() {
  const { isDemo } = useAuth();
  if (isDemo) return <DemoCarpool />;
  return <RealCarpool />;
}

/* ── Real ──────────────────────────────────────────────────────────────── */

function RealCarpool() {
  const { user } = useAuth();
  const { data: kids } = useKids();
  const { data: memberships } = useMemberships();
  const schoolId = kids[0]?.schoolId ?? memberships[0]?.schoolId;
  const [tab, setTab] = useState<"find" | "offer">("find");

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
            onPress={() => setTab(t)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {!schoolId ? (
        <EmptyState
          icon="school-outline"
          title="لا توجد مدرسة مرتبطة"
          subtitle="انضم لمدرسة برمز من إعداد ولي الأمر لعرض رحلات التوصيل."
        />
      ) : tab === "find" ? (
        <FindTrips
          schoolId={schoolId}
          kids={kids.map((k) => ({ id: k.id, name: k.name }))}
          uid={user?.uid}
        />
      ) : (
        <OfferTrip schoolId={schoolId} uid={user?.uid} />
      )}
    </Screen>
  );
}

function FindTrips({
  schoolId,
  kids,
  uid,
}: {
  schoolId: string;
  kids: { id: string; name: string }[];
  uid?: string;
}) {
  const { data: trips, loading } = useCarpoolTrips(schoolId);
  const [tripId, setTripId] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const { data: reqs } = useCarpoolRequests(tripId ?? undefined);
  const mine = reqs.find((r) => r.requesterUid === uid);

  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!tripId || sel.length === 0) return;
    try {
      await requestCarpoolJoin(tripId, sel);
    } catch (e) {
      Alert.alert("تعذّر", e instanceof Error ? e.message : "خطأ");
    }
  };

  if (loading) return null;
  if (trips.length === 0)
    return (
      <EmptyState
        icon="car-outline"
        title="لا توجد رحلات معروضة"
        subtitle="اعرض رحلتك من التبويب الآخر."
      />
    );

  return (
    <View style={{ gap: space.sm }}>
      {trips.map((t) => {
        const open = tripId === t.id;
        return (
          <Card
            key={t.id}
            onPress={() => setTripId(open ? null : t.id)}
            style={open ? { borderColor: color.primary } : undefined}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar size={40} tone="success" />
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">
                  {t.vehicle.make} · {t.vehicle.plate}
                </AppText>
                <AppText variant="label">
                  {DIR_LABEL[t.direction]} · {t.seatsTotal - t.seatsTaken} مقاعد متاحة
                </AppText>
              </View>
              <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={color.textDim} />
            </View>

            {open && (
              <View style={{ marginTop: space.md, gap: space.sm }}>
                {mine ? (
                  <Badge
                    label={
                      mine.status === "pending"
                        ? "طلبك قيد المراجعة"
                        : mine.status === "accepted"
                          ? "تم قبول طلبك"
                          : "لم يُقبل الطلب"
                    }
                    tone={
                      mine.status === "accepted"
                        ? "success"
                        : mine.status === "pending"
                          ? "warning"
                          : "danger"
                    }
                  />
                ) : (
                  <>
                    <AppText variant="label">اختر الأبناء:</AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                      {kids.map((k) => (
                        <Button
                          key={k.id}
                          label={k.name.split(" ")[0] ?? ""}
                          size="sm"
                          variant={sel.includes(k.id) ? "primary" : "secondary"}
                          onPress={() => toggle(k.id)}
                        />
                      ))}
                    </View>
                    <Button label="طلب الانضمام" disabled={sel.length === 0} onPress={submit} />
                  </>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

function OfferTrip({ schoolId, uid }: { schoolId: string; uid?: string }) {
  const { data: trips } = useCarpoolTrips(schoolId);
  const myTrip = trips.find((t) => t.driverUid === uid);
  const { data: reqs } = useCarpoolRequests(myTrip?.id);

  const [make, setMake] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState(2);
  const [dir, setDir] = useState<CarpoolTrip["direction"]>("round_trip");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setBusy(true);
    try {
      await offerCarpoolTrip({
        schoolId,
        direction: dir,
        seatsTotal: seats,
        weekDays: [0, 1, 2, 3, 4],
        vehicle: { make: make.trim() || "سيارة", colour: "-", plate: plate.trim() || "-" },
      });
    } catch (e) {
      Alert.alert("تعذّر", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  if (myTrip) {
    return (
      <View style={{ gap: space.md }}>
        <Card>
          <AppText variant="subtitle">رحلتك منشورة</AppText>
          <AppText variant="label" style={{ marginTop: 4 }}>
            {myTrip.vehicle.make} · {myTrip.vehicle.plate} · {DIR_LABEL[myTrip.direction]}
          </AppText>
        </Card>
        <AppText variant="label">طلبات الانضمام ({reqs.length})</AppText>
        {reqs.length === 0 && <EmptyState icon="mail-outline" title="لا طلبات بعد" />}
        {reqs.map((r) => (
          <Card key={r.id} padding={space.md}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar size={36} />
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {r.kidIds.length} طفل · {r.status === "pending" ? "بانتظار قرارك" : r.status}
              </AppText>
            </View>
            {r.status === "pending" && (
              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
                <Button
                  label="رفض"
                  variant="danger"
                  style={{ flex: 1 }}
                  onPress={() => uid && decideCarpoolRequest(myTrip.id, r.id, false, uid)}
                />
                <Button
                  label="قبول"
                  style={{ flex: 2 }}
                  onPress={() => uid && decideCarpoolRequest(myTrip.id, r.id, true, uid)}
                />
              </View>
            )}
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Field label="السيارة" value={make} onChangeText={setMake} placeholder="مثال: تويوتا كامري" />
      <Field label="اللوحة" value={plate} onChangeText={setPlate} placeholder="أ ب ج 1234" />
      <AppText variant="label">المقاعد المتاحة</AppText>
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
      <AppText variant="label">الاتجاه</AppText>
      <View style={{ gap: space.sm }}>
        {(["round_trip", "to_school", "from_school"] as const).map((d) => (
          <Button
            key={d}
            label={DIR_LABEL[d]!}
            variant={dir === d ? "primary" : "secondary"}
            onPress={() => setDir(d)}
          />
        ))}
      </View>
      <Button label="نشر الرحلة" icon="megaphone-outline" loading={busy} onPress={post} />
    </View>
  );
}

/* ── Demo (offline preview, unchanged sim) ────────────────────────────── */

const DEMO_DRIVERS = [
  {
    id: "P1",
    name: "أبو خالد الدوسري",
    car: "GMC يوكون",
    plate: "ز ح ط 9012",
    seats: 3,
    verified: true,
  },
  {
    id: "P2",
    name: "أم سارة العتيبي",
    car: "هونداي H1",
    plate: "د ه و 5678",
    seats: 2,
    verified: true,
  },
  {
    id: "P3",
    name: "أبو فيصل الشمري",
    car: "لاند كروزر",
    plate: "ي ك ل 3456",
    seats: 4,
    verified: false,
  },
];

function DemoCarpool() {
  const { data: kids } = useKids();
  const [step, setStep] = useState<"kids" | "list" | "request" | "active">("kids");
  const [sel, setSel] = useState<string[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"sending" | "waiting" | "accepted">("sending");
  const [elapsed, setElapsed] = useState(0);
  const driver = DEMO_DRIVERS.find((d) => d.id === driverId);
  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  useEffect(() => {
    if (step !== "request") return;
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
      <Badge label="وضع تجريبي" tone="neutral" />
      {step === "kids" && (
        <View style={{ marginTop: space.md }}>
          <AppText variant="subtitle">من تريد توصيله؟</AppText>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {kids.map((k) => (
              <Card
                key={k.id}
                onPress={() => toggle(k.id)}
                padding={space.md}
                style={sel.includes(k.id) ? { borderColor: color.primary } : undefined}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Avatar size={40} />
                  <AppText variant="subtitle" style={{ flex: 1 }}>
                    {k.name}
                  </AppText>
                  <Icon
                    name={sel.includes(k.id) ? "checkbox" : "square-outline"}
                    size={20}
                    color={sel.includes(k.id) ? color.primary : color.textDim}
                  />
                </View>
              </Card>
            ))}
          </View>
          <Button
            label="بحث"
            icon="search-outline"
            disabled={sel.length === 0}
            onPress={() => setStep("list")}
            style={{ marginTop: space.lg }}
          />
        </View>
      )}
      {step === "list" && (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          {DEMO_DRIVERS.map((d) => (
            <Card
              key={d.id}
              onPress={() => setDriverId(d.id)}
              style={driverId === d.id ? { borderColor: color.primary } : undefined}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Avatar size={44} tone={d.verified ? "success" : "warning"} />
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{d.name}</AppText>
                  <AppText variant="label">
                    {d.car} · {d.seats} مقاعد
                  </AppText>
                </View>
                <Badge
                  label={d.verified ? "موثّق" : "قيد التحقق"}
                  tone={d.verified ? "success" : "warning"}
                />
              </View>
            </Card>
          ))}
          <Button label="طلب الانضمام" disabled={!driverId} onPress={() => setStep("request")} />
        </View>
      )}
      {step === "request" && driver && (
        <Card style={{ alignItems: "center", paddingVertical: space.xl, marginTop: space.md }}>
          <Icon
            name={phase === "accepted" ? "checkmark-circle" : "hourglass-outline"}
            size={28}
            color={color.primary}
          />
          <AppText variant="subtitle" style={{ marginTop: space.md }}>
            {phase === "sending"
              ? "جارٍ الإرسال…"
              : phase === "waiting"
                ? `${driver.name} ينظر في الطلب…`
                : "تم القبول"}
          </AppText>
        </Card>
      )}
      {step === "active" && driver && (
        <View style={{ gap: space.md, marginTop: space.md }}>
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
            <AppText variant="subtitle">{driver.name}</AppText>
            <AppText variant="label" style={{ marginBottom: space.sm }}>
              {driver.car} · {driver.plate}
            </AppText>
            <ProgressBar value={(elapsed / 60) * 100} tone="success" height={8} />
          </Card>
        </View>
      )}
    </Screen>
  );
}
