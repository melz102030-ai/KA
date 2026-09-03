import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import type { Kid } from "@akbadna/core";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  ProgressBar,
  Screen,
  SectionHeader,
  StatCard,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useKids } from "@/data/hooks";
import { call } from "@/lib/functions";
import { DEMO_SCHEDULE } from "@/data/demo";
import {
  currentPeriod,
  fmtDate,
  fmtTime,
  nextPeriod,
  periodProgress,
  vitalsTone,
} from "@/lib/time";
import { color, font, space } from "@/theme";

const PRESENCE: Record<
  string,
  { label: string; tone: "success" | "info" | "warning" | "neutral" }
> = {
  in_class: { label: "في الحصة", tone: "success" },
  break: { label: "استراحة", tone: "info" },
  commuting: { label: "في الطريق", tone: "warning" },
  home: { label: "في المنزل", tone: "neutral" },
  left_school: { label: "غادر المدرسة", tone: "warning" },
  activity: { label: "نشاط", tone: "info" },
  unknown: { label: "غير معروف", tone: "neutral" },
};

export default function Home() {
  const { profile, isDemo } = useAuth();
  const { data: kids } = useKids();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cur = currentPeriod(DEMO_SCHEDULE, now);
  const next = nextPeriod(DEMO_SCHEDULE, now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const minsToNext = next ? Math.max(0, toMins(next.start) - mins) : null;

  const ping = (k: Kid) =>
    Alert.alert("إرسال نداء", `سيتم تنبيه ساعة ${k.name.split(" ")[0]} الآن.`);
  const locate = (k: Kid) =>
    Alert.alert("الموقع", k.live.location ? "عرض آخر موقع معروف." : "لا يوجد موقع محدّث بعد.");
  const sos = async (k: Kid) => {
    if (!k.watchId || !k.live.location) {
      Alert.alert("استغاثة", "لا توجد ساعة مرتبطة بموقع حالي.");
      return;
    }
    try {
      await call("raiseSos", {
        watchId: k.watchId,
        lat: k.live.location.lat,
        lng: k.live.location.lng,
      });
      Alert.alert("استغاثة", "تم رفع التنبيه وإشعار الجهات.");
    } catch {
      Alert.alert("استغاثة", "تعذّر الاتصال بالخادم.");
    }
  };

  return (
    <Screen>
      <View style={styles_header}>
        <View>
          <AppText variant="label">مرحبًا</AppText>
          <AppText variant="title">{profile?.displayName ?? "أكبادنا"}</AppText>
        </View>
        <View style={styles_bell}>
          <Icon name="notifications-outline" size={20} color={color.text} />
        </View>
      </View>

      {isDemo && (
        <Card
          padding={space.md}
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
        >
          <Icon name="information-circle-outline" size={18} color={color.info} />
          <AppText variant="label" style={{ flex: 1 }}>
            وضع تجريبي — لم يتم ربط مدرسة أو ساعة بعد.
          </AppText>
        </Card>
      )}

      {/* Time + current period */}
      <Card style={{ marginTop: space.md }}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <AppText style={{ fontFamily: font.family.mono, fontSize: 30, color: color.text }}>
            {fmtTime(now)}
          </AppText>
          <AppText variant="label">{fmtDate(now)}</AppText>
        </View>

        {cur ? (
          <View style={{ marginTop: space.lg, gap: space.sm }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <AppText variant="caption">الحصة الحالية</AppText>
                <AppText variant="subtitle">{cur.name}</AppText>
              </View>
              <Badge label={`${cur.start} – ${cur.end}`} tone="primary" />
            </View>
            <ProgressBar value={periodProgress(cur, now) * 100} />
          </View>
        ) : (
          <AppText variant="label" style={{ marginTop: space.lg }}>
            لا توجد حصة حالية.
          </AppText>
        )}

        {next && minsToNext !== null && minsToNext > 0 && (
          <View style={styles_next}>
            <Icon name="time-outline" size={16} color={color.textMuted} />
            <AppText variant="label" style={{ flex: 1 }}>
              التالية: {next.name}
            </AppText>
            <AppText variant="subtitle" color={color.primary}>
              {minsToNext} د
            </AppText>
          </View>
        )}
      </Card>

      <SectionHeader>الأبناء</SectionHeader>
      <View style={{ gap: space.md }}>
        {kids.map((k) => {
          const hr = k.live.heartRate ?? 0;
          const temp = k.live.skinTempC ?? 0;
          const batt = k.live.batteryPct ?? 0;
          const pres = PRESENCE[k.live.presence] ?? PRESENCE.unknown!;
          return (
            <Card key={k.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Avatar name={k.name} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">{k.name}</AppText>
                  <AppText variant="label">{k.gradeLabel}</AppText>
                </View>
                <Badge
                  label={pres.label}
                  tone={pres.tone}
                  icon={k.live.watchOnline ? "ellipse" : "ellipse-outline"}
                />
              </View>

              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                <StatCard
                  label="النبض"
                  value={String(Math.round(hr))}
                  unit="bpm"
                  icon="heart-outline"
                  tone={vitalsTone.heartRate(hr)}
                />
                <StatCard
                  label="الحرارة"
                  value={temp.toFixed(1)}
                  unit="°"
                  icon="thermometer-outline"
                />
                <StatCard
                  label="البطارية"
                  value={String(Math.round(batt))}
                  unit="%"
                  icon="battery-half-outline"
                  tone={vitalsTone.battery(batt)}
                />
              </View>

              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                <Button
                  label="نداء"
                  size="sm"
                  variant="secondary"
                  icon="notifications-outline"
                  onPress={() => ping(k)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="الموقع"
                  size="sm"
                  variant="secondary"
                  icon="location-outline"
                  onPress={() => locate(k)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="استغاثة"
                  size="sm"
                  variant="danger"
                  icon="warning-outline"
                  onPress={() => sos(k)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const styles_header = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  paddingVertical: space.md,
};
const styles_bell = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: color.surface,
  borderWidth: 1,
  borderColor: color.border,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
const styles_next = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: space.sm,
  marginTop: space.md,
  paddingTop: space.md,
  borderTopWidth: 1,
  borderTopColor: color.border,
};
