import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import type { Kid } from "@akbadna/core";
import {
  AppText,
  Avatar,
  Button,
  Card,
  Dot,
  Pill,
  ProgressBar,
  Screen,
  SectionTitle,
  StatTile,
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
  useVitalsColor,
} from "@/lib/time";
import { alpha, color, font, radius, space } from "@/theme";

export default function Home() {
  const { profile } = useAuth();
  const { data: kids, isDemo } = useKids();
  const vc = useVitalsColor();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ping = (k: Kid) =>
    Alert.alert("📳 نداء", `تم إرسال نداء إلى ساعة ${k.name.split(" ")[0]} — ستهتز الآن.`);

  const locate = (k: Kid) =>
    Alert.alert(
      "📍 الموقع",
      k.live.location ? `آخر موقع معروف لـ ${k.name.split(" ")[0]}.` : "لا يوجد موقع محدث بعد.",
    );

  const sos = async (k: Kid) => {
    if (!k.watchId || !k.live.location) {
      Alert.alert("🆘 SOS", "لا توجد ساعة مرتبطة بموقع حالي لهذا الطفل.");
      return;
    }
    try {
      await call("raiseSos", {
        watchId: k.watchId,
        lat: k.live.location.lat,
        lng: k.live.location.lng,
      });
      Alert.alert("🆘 SOS", "تم رفع تنبيه الاستغاثة وإشعار الجهات.");
    } catch {
      Alert.alert("🆘 SOS", "تعذّر الاتصال بالخادم.");
    }
  };

  const cur = currentPeriod(DEMO_SCHEDULE, now);
  const next = nextPeriod(DEMO_SCHEDULE, now);
  const minsToNext = next
    ? Math.max(0, Math.round(toMins(next.start) - (now.getHours() * 60 + now.getMinutes())))
    : null;

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: space.lg,
        }}
      >
        <View>
          <AppText variant="label">مرحباً 👋</AppText>
          <AppText variant="title">{profile?.displayName ?? "أكبادنا"}</AppText>
        </View>
        <Avatar emoji="👨" size={46} accent={color.blue} />
      </View>

      {isDemo && (
        <Card accent={color.yellow} style={{ marginBottom: space.md, paddingVertical: space.sm }}>
          <AppText variant="label" color={color.yellow}>
            بيانات تجريبية — لم يتم ربط مدرسة أو ساعة بعد
          </AppText>
        </Card>
      )}

      {/* Big clock */}
      <Card
        accent={color.teal}
        glow
        style={{ alignItems: "center", paddingVertical: space.xl, marginBottom: space.md }}
      >
        <AppText variant="label" color={color.teal}>
          ⌚ أكبادنا
        </AppText>
        <AppText
          style={{
            fontFamily: font.family.mono,
            fontSize: 46,
            color: color.text,
            marginVertical: space.xs,
          }}
        >
          {fmtTime(now)}
        </AppText>
        <AppText variant="label">{fmtDate(now)}</AppText>
      </Card>

      {/* Current period */}
      {cur ? (
        <Card style={{ marginBottom: space.sm }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: space.sm,
            }}
          >
            <View>
              <AppText variant="label">الحصة الحالية</AppText>
              <AppText variant="heading">{cur.name}</AppText>
              <AppText variant="label">
                {cur.start} – {cur.end}
              </AppText>
            </View>
            <Pill label="جارية" accent={color.teal} />
          </View>
          <ProgressBar value={periodProgress(cur, now) * 100} accent={color.teal} />
        </Card>
      ) : (
        <Card style={{ alignItems: "center", marginBottom: space.sm, paddingVertical: space.lg }}>
          <AppText style={{ fontSize: 28 }}>🌙</AppText>
          <AppText variant="label">لا توجد حصة حالياً</AppText>
        </Card>
      )}

      {/* Next period */}
      {next && minsToNext !== null && minsToNext > 0 && (
        <Card
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            marginBottom: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="label">الحصة التالية</AppText>
            <AppText variant="heading">{next.name}</AppText>
          </View>
          <View
            style={{
              backgroundColor: alpha(color.yellow, 0.15),
              borderRadius: radius.md,
              paddingVertical: 6,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <AppText
              style={{
                color: color.yellow,
                fontFamily: font.family.sansBlack,
                fontSize: font.size.xl,
              }}
            >
              {minsToNext}
            </AppText>
            <AppText style={{ color: color.yellow, fontSize: 9 }}>دقيقة</AppText>
          </View>
        </Card>
      )}

      {/* Kids */}
      <SectionTitle>أبنائي</SectionTitle>
      <View style={{ gap: space.md }}>
        {kids.map((k) => {
          const hr = k.live.heartRate ?? 0;
          const temp = k.live.skinTempC ?? 0;
          const batt = k.live.batteryPct ?? 0;
          return (
            <Card key={k.id}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  marginBottom: space.md,
                }}
              >
                <Avatar emoji={k.photoEmoji} size={46} />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{k.name}</AppText>
                  <AppText variant="label">{k.gradeLabel}</AppText>
                  <AppText
                    style={{
                      color: color.purple,
                      fontSize: 10,
                      fontFamily: font.family.mono,
                      marginTop: 2,
                    }}
                  >
                    🆔 {k.akbadnaId}
                  </AppText>
                </View>
                <Dot color={k.live.watchOnline ? color.green : color.textDim} />
              </View>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <StatTile
                  label="نبض"
                  value={String(Math.round(hr))}
                  unit=" bpm"
                  accent={vc.heartRate(hr)}
                />
                <StatTile label="حرارة" value={temp.toFixed(1)} unit="°" accent={color.teal} />
                <StatTile
                  label="بطارية"
                  value={String(Math.round(batt))}
                  unit="%"
                  accent={vc.battery(batt)}
                />
              </View>
              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                <Button
                  label="📳 نداء"
                  size="sm"
                  variant="outline"
                  accent={color.teal}
                  onPress={() => ping(k)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="📍 موقع"
                  size="sm"
                  variant="outline"
                  accent={color.yellow}
                  onPress={() => locate(k)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="🆘 SOS"
                  size="sm"
                  variant="outline"
                  accent={color.red}
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
