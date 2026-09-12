import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import {
  livePresence,
  suggestedStatus,
  type AttendanceStatus,
  type GeoPoint,
  type Kid,
  type LivePresence,
} from "@akbadna/core";
import { AppText, Button, Card, Dot, EmptyState, Icon, Screen } from "@/components";
import { EditableAvatar } from "@/components/AvatarPicker";
import { useAuth } from "@/lib/auth";
import { useClass, useMemberships, useRoster, useSchool } from "@/data/hooks";
import { submitAttendance } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

const OPTIONS: { s: AttendanceStatus; label: string; tone: string }[] = [
  { s: "present", label: "حاضر", tone: color.success },
  { s: "late", label: "متأخر", tone: color.warning },
  { s: "absent", label: "غائب", tone: color.danger },
];

/** How each live reading is painted. Green / yellow / red, as asked for. */
const LIVE: Record<LivePresence, { label: string; tone: string; icon: string }> = {
  present: { label: "داخل المدرسة", tone: color.success, icon: "school" },
  nearby: { label: "قرب المدرسة", tone: color.warning, icon: "walk" },
  away: { label: "خارج النطاق", tone: color.danger, icon: "close-circle" },
  unknown: { label: "لا إشارة", tone: color.textDim, icon: "help-circle" },
};

const DEMO_SCHOOL: { location: GeoPoint; campusRadiusM: number } = {
  location: { lat: 24.7136, lng: 46.6753 },
  campusRadiusM: 150,
};

/** Offsets a point north by a distance, so the demo roster sits at known radii. */
const METRES_PER_DEGREE = (Math.PI * 6_371_000) / 180;
const outFromSchool = (metres: number): GeoPoint => ({
  lat: DEMO_SCHOOL.location.lat + metres / METRES_PER_DEGREE,
  lng: DEMO_SCHOOL.location.lng,
});

type RosterEntry = { id: string; name: string; location?: GeoPoint; lastTelemetryAt?: number };

const DEMO_ROSTER = (now: number): RosterEntry[] => [
  {
    id: "s1",
    name: "أحمد محمد الغامدي",
    location: outFromSchool(40),
    lastTelemetryAt: now - 20_000,
  },
  {
    id: "s2",
    name: "سارة عبدالله العتيبي",
    location: outFromSchool(95),
    lastTelemetryAt: now - 45_000,
  },
  {
    id: "s3",
    name: "خالد سعد الدوسري",
    location: outFromSchool(260),
    lastTelemetryAt: now - 30_000,
  },
  {
    id: "s4",
    name: "نورة فهد الشمري",
    location: outFromSchool(2_400),
    lastTelemetryAt: now - 60_000,
  },
  {
    id: "s5",
    name: "عمر ناصر القحطاني",
    location: outFromSchool(120),
    lastTelemetryAt: now - 15_000,
  },
  // No fix at all: must land in "لا إشارة", never in "غائب".
  { id: "s6", name: "لينا فيصل الزهراني" },
];

export default function Attendance() {
  const { isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const teach = memberships.find((m) => m.role === "teacher" && m.classIds.length);
  const schoolId = teach?.schoolId;
  const classId = teach?.classIds[0];
  const { data: cls } = useClass(schoolId, classId);
  const { data: school } = useSchool(schoolId);
  const { data: rosterKids } = useRoster(cls?.studentIds ?? []);

  // Re-evaluate on a timer: a fix going stale has to move a row to "لا إشارة"
  // on its own, without the teacher pulling to refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const roster: RosterEntry[] = useMemo(
    () =>
      isDemo
        ? DEMO_ROSTER(now)
        : rosterKids.map((k: Kid) => ({
            id: k.id,
            name: k.name,
            location: k.live.location,
            lastTelemetryAt: k.live.lastTelemetryAt,
          })),
    [isDemo, rosterKids, now],
  );

  const fence = isDemo
    ? DEMO_SCHOOL
    : { location: school?.location, campusRadiusM: school?.campusRadiusM ?? 150 };

  const live = useMemo(() => {
    const out: Record<string, LivePresence> = {};
    for (const s of roster) {
      out[s.id] = livePresence({
        kidLocation: s.location,
        lastTelemetryAt: s.lastTelemetryAt,
        schoolLocation: fence.location,
        campusRadiusM: fence.campusRadiusM,
        now,
      });
    }
    return out;
  }, [roster, fence.location, fence.campusRadiusM, now]);

  const liveCounts = useMemo(() => {
    const c: Record<LivePresence, number> = { present: 0, nearby: 0, away: 0, unknown: 0 };
    for (const s of roster) c[live[s.id] ?? "unknown"]++;
    return c;
  }, [roster, live]);

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const counts = OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.s]: Object.values(marks).filter((m) => m === o.s).length }),
    {} as Record<AttendanceStatus, number>,
  );

  /** Fills the marks from the live readings. Students with no signal stay blank. */
  const applyLive = () => {
    const next: Record<string, AttendanceStatus> = {};
    let skipped = 0;
    for (const s of roster) {
      const suggested = suggestedStatus(live[s.id] ?? "unknown");
      if (suggested) next[s.id] = suggested;
      else skipped++;
    }
    setMarks(next);
    if (skipped) {
      Alert.alert(
        "تم اعتماد الحالة المباشرة",
        `${skipped} طالب بلا إشارة من الساعة — لم يُعلَّم أحد منهم تلقائيًا، حدّدهم يدويًا.`,
      );
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (!isDemo && schoolId && classId) {
        await submitAttendance({
          schoolId,
          classId,
          date: new Date().toISOString().slice(0, 10),
          marks: Object.entries(marks).map(([kidId, status]) => ({ kidId, status })),
        });
      }
      Alert.alert(
        "تم تسجيل الحضور",
        `حاضر ${counts.present} · متأخر ${counts.late} · غائب ${counts.absent}${
          isDemo || !schoolId ? "\n(وضع تجريبي — لم يُرسل للخادم)" : ""
        }`,
      );
      setMarks({});
    } catch (e) {
      Alert.alert("تعذّر الحفظ", e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const title = isDemo ? "الأول المتوسط — أ" : (cls?.name ?? "لا يوجد فصل");
  const fenceReady = Boolean(fence.location);

  return (
    <Screen>
      <AppText variant="title" style={{ paddingTop: space.md }}>
        الحضور
      </AppText>
      <AppText variant="label" style={{ marginBottom: space.md }}>
        {title} · {roster.length} طلاب
      </AppText>

      {!isDemo && !classId && (
        <EmptyState
          icon="school-outline"
          title="لا يوجد فصل مرتبط"
          subtitle="أنشئ مدرسة وفصلًا من إعداد المعلم لبدء تسجيل الحضور."
        />
      )}

      {roster.length > 0 && (
        <>
          {/* Live picture first — it is what the teacher looks at. */}
          <Card padding={space.md} style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Dot tone="success" size={7} />
              <AppText variant="label" style={{ flex: 1 }}>
                الحالة المباشرة من الساعات
              </AppText>
            </View>
            <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
              {(["present", "nearby", "away", "unknown"] as const).map((k) => (
                <View key={k} style={[styles_stat, { borderColor: alpha(LIVE[k].tone, 0.35) }]}>
                  <AppText
                    style={{ fontFamily: font.family.numBold, fontSize: 20, color: LIVE[k].tone }}
                  >
                    {liveCounts[k]}
                  </AppText>
                  <AppText variant="caption">{LIVE[k].label}</AppText>
                </View>
              ))}
            </View>
            {!fenceReady && (
              <AppText variant="caption" color={color.warning} style={{ marginTop: space.sm }}>
                لم يُحدَّد موقع المدرسة بعد، فلا يمكن تمييز من هو داخل النطاق.
              </AppText>
            )}
          </Card>

          <Button
            label="اعتماد الحالة المباشرة"
            variant="secondary"
            icon="flash-outline"
            disabled={!fenceReady}
            onPress={applyLive}
            style={{ marginBottom: space.md }}
          />

          <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
            {OPTIONS.map((o) => (
              <View key={o.s} style={[styles_stat, { borderColor: alpha(o.tone, 0.35) }]}>
                <AppText style={{ fontFamily: font.family.numBold, fontSize: 20, color: o.tone }}>
                  {counts[o.s] ?? 0}
                </AppText>
                <AppText variant="caption">{o.label}</AppText>
              </View>
            ))}
          </View>

          <View style={{ gap: space.sm }}>
            {roster.map((st) => {
              const state = live[st.id] ?? "unknown";
              const l = LIVE[state];
              return (
                <Card key={st.id} padding={space.md} style={{ borderColor: alpha(l.tone, 0.4) }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <EditableAvatar subjectId={st.id} name={st.name} size={38} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle">{st.name}</AppText>
                      <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}
                      >
                        <Icon name={l.icon as never} size={13} color={l.tone} />
                        <AppText variant="caption" color={l.tone}>
                          {l.label}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
                    {OPTIONS.map((o) => {
                      const active = marks[st.id] === o.s;
                      return (
                        <Pressable
                          key={o.s}
                          onPress={() => setMarks((p) => ({ ...p, [st.id]: o.s }))}
                          style={{
                            flex: 1,
                            paddingVertical: space.sm,
                            borderRadius: radius.md,
                            alignItems: "center",
                            backgroundColor: active ? alpha(o.tone, 0.12) : color.bg,
                            borderWidth: 1,
                            borderColor: active ? o.tone : color.border,
                          }}
                        >
                          <AppText
                            variant="label"
                            color={active ? o.tone : color.textMuted}
                            weight={active ? "bold" : "regular"}
                          >
                            {o.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>

          <Button
            label="حفظ الحضور"
            icon="checkmark-done-outline"
            loading={saving}
            disabled={Object.keys(marks).length === 0}
            onPress={submit}
            style={{ marginTop: space.lg }}
          />
        </>
      )}
    </Screen>
  );
}

const styles_stat = {
  flex: 1,
  alignItems: "center" as const,
  paddingVertical: space.sm,
  borderRadius: radius.md,
  borderWidth: 1,
  backgroundColor: color.surface,
};
