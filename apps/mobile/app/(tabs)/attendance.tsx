import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { showAlert } from "@/lib/dialog";
import {
  LATE_COUNTDOWN_SEC,
  REWARD_GLYPHS,
  REWARD_LABELS,
  livePresence,
  suggestedStatus,
  type AttendanceStatus,
  type GeoPoint,
  type Kid,
  type LivePresence,
  type RewardGlyph,
} from "@akbadna/core";
import { AppText, Button, Card, Dot, EmptyState, Icon, Screen } from "@/components";
import { EditableAvatar } from "@/components/AvatarPicker";
import { useAuth } from "@/lib/auth";
import { useClass, useMemberships, useRoster, useSchool } from "@/data/hooks";
import {
  decideEnrolment,
  queueAttendanceCue,
  sendReward,
  submitAttendance,
} from "@/data/mutations";
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

type RosterEntry = {
  id: string;
  name: string;
  watchId?: string;
  location?: GeoPoint;
  lastTelemetryAt?: number;
};

/** What the child's watch was told, per the mark the teacher just made. */
const CUE_FEEDBACK: Record<AttendanceStatus, string> = {
  present: "أُرسل للساعة: تهنئة 👍",
  late: `أُرسل للساعة: عدّاد ${LATE_COUNTDOWN_SEC / 60} دقائق`,
  absent: "أُرسل للساعة: بانتظار رد ولي الأمر",
  excused: "لم يُرسل شيء للساعة",
};

const DEMO_ROSTER = (now: number): RosterEntry[] => [
  {
    id: "s1",
    watchId: "demo-w1",
    name: "أحمد محمد الغامدي",
    location: outFromSchool(40),
    lastTelemetryAt: now - 20_000,
  },
  {
    id: "s2",
    watchId: "demo-w2",
    name: "سارة عبدالله العتيبي",
    location: outFromSchool(95),
    lastTelemetryAt: now - 45_000,
  },
  {
    id: "s3",
    watchId: "demo-w3",
    name: "خالد سعد الدوسري",
    location: outFromSchool(260),
    lastTelemetryAt: now - 30_000,
  },
  {
    id: "s4",
    watchId: "demo-w4",
    name: "نورة فهد الشمري",
    location: outFromSchool(2_400),
    lastTelemetryAt: now - 60_000,
  },
  {
    id: "s5",
    watchId: "demo-w5",
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

  /**
   * Children whose family redeemed the class code but whom no teacher has
   * admitted yet. They are deliberately absent from the register below: a
   * family cannot put its own child on a roster.
   */
  const waiting = isDemo ? [] : rosterKids.filter((k: Kid) => k.enrolmentStatus === "pending");

  const decide = (kidId: string, admit: boolean) => {
    if (!schoolId || !classId) return;
    void decideEnrolment({ kidId, schoolId, classId, admit });
  };

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [cueState, setCueState] = useState<Record<string, string>>({});
  const [awarded, setAwarded] = useState<Record<string, RewardGlyph>>({});
  const [saving, setSaving] = useState(false);

  /**
   * Marks the student and tells their watch, in that order. The register is the
   * teacher's record; it must stand whether or not the device is reachable, so
   * the cue result is shown on the row rather than thrown.
   */
  const mark = (student: RosterEntry, status: AttendanceStatus) => {
    setMarks((p) => ({ ...p, [student.id]: status }));
    if (isDemo) {
      setCueState((p) => ({ ...p, [student.id]: CUE_FEEDBACK[status] }));
      return;
    }
    setCueState((p) => ({ ...p, [student.id]: "جارٍ الإرسال للساعة…" }));
    void queueAttendanceCue({ kidId: student.id, watchId: student.watchId, status }).then((r) =>
      setCueState((p) => ({
        ...p,
        [student.id]:
          r === "sent"
            ? CUE_FEEDBACK[status]
            : r === "no-watch"
              ? "لا توجد ساعة مقترنة"
              : r === "skipped"
                ? CUE_FEEDBACK[status]
                : "تعذّر الإرسال للساعة",
      })),
    );
  };

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
      if (suggested) {
        next[s.id] = suggested;
        if (isDemo) {
          setCueState((p) => ({ ...p, [s.id]: CUE_FEEDBACK[suggested] }));
        } else {
          void queueAttendanceCue({ kidId: s.id, watchId: s.watchId, status: suggested });
        }
      } else skipped++;
    }
    setMarks(next);
    if (skipped) {
      showAlert(
        "تم اعتماد الحالة المباشرة",
        `${skipped} طالب بلا إشارة من الساعة — لم يُعلَّم أحد منهم تلقائيًا، حدّدهم يدويًا.`,
      );
    }
  };

  /**
   * Awards a badge for standing out. Kept separate from the register: praise is
   * not an attendance mark, and giving one must not disturb what the teacher
   * has already recorded for that student.
   */
  const award = (student: RosterEntry, glyph: RewardGlyph) => {
    setAwarded((p) => ({ ...p, [student.id]: glyph }));
    if (isDemo) {
      setCueState((p) => ({ ...p, [student.id]: `${glyph} أُرسل للساعة حتى نهاية اليوم` }));
      return;
    }
    void sendReward({
      kidId: student.id,
      watchId: student.watchId,
      glyph,
      timeZone: school?.timezone,
    }).then((r) =>
      setCueState((p) => ({
        ...p,
        [student.id]:
          r === "sent"
            ? `${glyph} أُرسل للساعة حتى نهاية اليوم`
            : r === "no-watch"
              ? "لا توجد ساعة مقترنة"
              : "تعذّر الإرسال للساعة",
      })),
    );
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
      showAlert(
        "تم تسجيل الحضور",
        `حاضر ${counts.present} · متأخر ${counts.late} · غائب ${counts.absent}${
          isDemo || !schoolId ? "\n(وضع تجريبي — لم يُرسل للخادم)" : ""
        }`,
      );
      setMarks({});
    } catch (e) {
      showAlert("تعذّر الحفظ", e instanceof Error ? e.message : "خطأ");
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

      {waiting.length > 0 && (
        <Card padding={space.md} style={{ marginBottom: space.md, borderColor: color.warning }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Icon name="person-add-outline" size={17} color={color.warning} />
            <AppText variant="subtitle" style={{ flex: 1 }}>
              طلبات انضمام ({waiting.length})
            </AppText>
          </View>
          <AppText variant="caption" style={{ marginTop: 3 }}>
            أسرٌ استخدمت رمز فصلك. لا يدخل الطالب القائمة قبل اعتمادك.
          </AppText>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {waiting.map((k: Kid) => (
              <View
                key={k.id}
                style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
              >
                <AppText variant="subtitle" style={{ flex: 1 }}>
                  {k.name}
                </AppText>
                <Button label="اعتماد" size="sm" onPress={() => decide(k.id, true)} />
                <Button
                  label="رفض"
                  size="sm"
                  variant="danger"
                  onPress={() => decide(k.id, false)}
                />
              </View>
            ))}
          </View>
        </Card>
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
                          onPress={() => mark(st, o.s)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`${o.label} — ${st.name}`}
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
                  {/* Standing out in the lesson — three badges, teacher's pick. */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.xs,
                      marginTop: space.sm,
                    }}
                  >
                    <AppText variant="caption" style={{ marginInlineEnd: space.xs }}>
                      تميّز:
                    </AppText>
                    {REWARD_GLYPHS.map((g) => {
                      const on = awarded[st.id] === g;
                      return (
                        <Pressable
                          key={g}
                          onPress={() => award(st, g)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`${REWARD_LABELS[g]} — ${st.name}`}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: radius.md,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: on ? color.primarySoft : color.bg,
                            borderWidth: 1,
                            borderColor: on ? color.primary : color.border,
                          }}
                        >
                          <AppText style={{ fontSize: 18 }}>{g}</AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {cueState[st.id] && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        marginTop: space.sm,
                      }}
                    >
                      <Icon name="watch-outline" size={13} color={color.textMuted} />
                      <AppText variant="caption">{cueState[st.id]}</AppText>
                    </View>
                  )}
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
