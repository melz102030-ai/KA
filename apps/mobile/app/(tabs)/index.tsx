import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import {
  SEGMENT_LABELS,
  classLabel,
  groupChildren,
  isDaytime,
  segmentsPresent,
  type Kid,
  type SchoolSegment,
} from "@akbadna/core";
import {
  AppText,
  Badge,
  Button,
  Card,
  Icon,
  ProgressBar,
  Screen,
  SectionHeader,
  StatCard,
} from "@/components";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { EditableAvatar } from "@/components/AvatarPicker";
import { useAlerts, useClass, useKids, useSchedule } from "@/data/hooks";
import { raiseKidSos } from "@/data/mutations";
import {
  currentPeriod,
  fmtDateParts,
  fmtDuration,
  fmtTimeParts,
  secondsUntilClock,
  weekdayName,
  nextPeriod,
  periodProgress,
  vitalsTone,
} from "@/lib/time";
import { color, font, radius, space } from "@/theme";

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
  const first = kids[0];
  const { data: cls } = useClass(first?.schoolId, first?.classId);
  const schedule = useSchedule(cls);
  const { data: alerts } = useAlerts(kids.map((k) => k.id));
  const { prefs } = usePrefs();
  const [now, setNow] = useState(() => new Date());
  // Only offered when the parent actually has children on both sides; a family
  // with only boys should not be asked to choose between two tabs.
  const sides = segmentsPresent(kids);
  const [side, setSide] = useState<SchoolSegment | "all">("all");
  const shown = side === "all" ? kids : kids.filter((k) => segmentsPresent([k])[0] === side);
  const { groups, unsorted } = groupChildren(shown);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = fmtTimeParts(now);
  const date = fmtDateParts(now, prefs.calendar);
  const weekday = weekdayName(now);
  // Daylight at the school when we know where it is, else the default city.
  const sunAt = kids.find((k) => k.live.location)?.live.location;
  const daylight = isDaytime(now.getTime(), sunAt?.lat, sunAt?.lng);
  const cur = currentPeriod(schedule, now);
  const next = nextPeriod(schedule, now);
  const secsToNext = next ? secondsUntilClock(next.start, now) : null;

  const ping = (k: Kid) =>
    Alert.alert("إرسال نداء", `سيتم تنبيه ساعة ${k.name.split(" ")[0]} الآن.`);
  const locate = (k: Kid) =>
    Alert.alert("الموقع", k.live.location ? "عرض آخر موقع معروف." : "لا يوجد موقع محدّث بعد.");
  const sos = async (k: Kid) => {
    const loc = k.live.location ?? { lat: 24.7136, lng: 46.6753 };
    try {
      if (isDemo) {
        Alert.alert("استغاثة", "وضع تجريبي — لم يُرفع تنبيه.");
        return;
      }
      await raiseKidSos(k.id, loc);
      Alert.alert("استغاثة", "تم رفع تنبيه الاستغاثة.");
    } catch (e) {
      Alert.alert("استغاثة", e instanceof Error ? e.message : "تعذّر الرفع.");
    }
  };

  return (
    <Screen>
      <View style={styles_header}>
        <View>
          <AppText variant="label">مرحبًا</AppText>
          <AppText variant="title">{profile?.displayName ?? "أكبادنا"}</AppText>
        </View>
        <Pressable style={styles_bell} onPress={() => router.push("/tools/alerts")}>
          <Icon name="notifications-outline" size={20} color={color.text} />
          {alerts.length > 0 && (
            <View style={styles_dot}>
              <AppText style={{ color: "#fff", fontSize: 10, fontFamily: font.family.bold }}>
                {alerts.length}
              </AppText>
            </View>
          )}
        </Pressable>
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

      {/* Time + current period.
          Right column: the weekday, then the clock with a sun or a crescent.
          Left column: the Hijri date, then the Gregorian under it. */}
      <Card style={{ marginTop: space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <AppText style={{ fontFamily: font.family.bold, fontSize: font.size.lg }}>
              يوم {weekday}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <AppText style={{ fontFamily: font.family.numBold, fontSize: 32, color: color.text }}>
                {clock.time}
              </AppText>
              {/* Reads before the letters ص and م do, for a child who cannot yet. */}
              <AppText style={{ fontSize: 24 }} accessibilityLabel={daylight ? "نهار" : "ليل"}>
                {daylight ? "☀️" : "🌙"}
              </AppText>
            </View>
          </View>
          <View style={{ alignItems: "flex-start", justifyContent: "center" }}>
            {/* Set at the weekday's size, so the two sides of the card read
                as one line of type rather than a heading beside a footnote. */}
            <AppText style={{ fontSize: font.size.lg, color: color.text }}>{date.primary}</AppText>
            {date.secondary && <AppText variant="label">{date.secondary}</AppText>}
          </View>
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
              {/* Separate Texts in a row: in RTL the first child sits on the
                  right, so the period reads start → end the way Arabic does.
                  A single bidi string put the end time first. */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: space.sm,
                  paddingVertical: 3,
                  borderRadius: radius.sm,
                  backgroundColor: color.moeGreenSoft,
                }}
              >
                <AppText
                  style={{
                    fontFamily: font.family.num,
                    fontSize: font.size.sm,
                    color: color.moeGreen,
                  }}
                >
                  {cur.start}
                </AppText>
                <AppText style={{ fontSize: font.size.sm, color: color.moeGreen }}>←</AppText>
                <AppText
                  style={{
                    fontFamily: font.family.num,
                    fontSize: font.size.sm,
                    color: color.moeGreen,
                  }}
                >
                  {cur.end}
                </AppText>
              </View>
            </View>
            <ProgressBar value={periodProgress(cur, now) * 100} />
          </View>
        ) : (
          <AppText variant="label" style={{ marginTop: space.lg }}>
            لا توجد حصة حالية.
          </AppText>
        )}

        {next && secsToNext !== null && secsToNext > 0 && (
          <View style={styles_next}>
            <Icon name="time-outline" size={16} color={color.textMuted} />
            <AppText variant="label" style={{ flex: 1 }}>
              التالية: {next.name}
            </AppText>
            {/* Ticks every second — the card already re-renders that often. */}
            <AppText
              style={{
                fontFamily: font.family.numBold,
                fontSize: font.size.lg,
                color: color.moeGreen,
              }}
            >
              {fmtDuration(secsToNext)}
            </AppText>
          </View>
        )}
      </Card>

      <SectionHeader
        action={
          <Button
            label="إضافة ابن"
            size="sm"
            variant="ghost"
            icon="person-add-outline"
            onPress={() => router.push("/tools/add-kid")}
          />
        }
      >
        الأبناء
      </SectionHeader>

      {sides.length > 1 && (
        <View style={{ flexDirection: "row", gap: space.xs, marginBottom: space.sm }}>
          {(["all", ...sides] as const).map((s) => (
            <Button
              key={s}
              label={s === "all" ? "الكل" : SEGMENT_LABELS[s]}
              size="sm"
              variant={side === s ? "primary" : "ghost"}
              onPress={() => setSide(s)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      )}

      {[
        ...groups.map((g) => ({ key: g.key, label: g.label, children: g.children })),
        ...(unsorted.length
          ? [{ key: "unsorted", label: "لم تُستكمل بياناتهم", children: unsorted }]
          : []),
      ].map((group) => (
        <View key={group.key} style={{ gap: space.md, marginBottom: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <View style={{ height: 1, flex: 1, backgroundColor: color.border }} />
            <AppText variant="caption" color={color.moeGreen}>
              {group.label}
            </AppText>
            <View style={{ height: 1, width: 14, backgroundColor: color.border }} />
          </View>
          {group.children.map((k) => {
            const hr = k.live.heartRate ?? 0;
            const temp = k.live.skinTempC ?? 0;
            const batt = k.live.batteryPct ?? 0;
            const pres = PRESENCE[k.live.presence] ?? PRESENCE.unknown!;
            return (
              <Card key={k.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <EditableAvatar subjectId={k.id} name={k.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{k.name}</AppText>
                    <AppText variant="label">
                      {k.grade ? classLabel(k.grade) : k.gradeLabel}
                    </AppText>
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
      ))}
    </Screen>
  );
}

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
const styles_dot = {
  position: "absolute" as const,
  top: -3,
  left: -3,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 4,
  borderRadius: 9,
  backgroundColor: color.danger,
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
