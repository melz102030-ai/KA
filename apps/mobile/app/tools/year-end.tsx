import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  CLOSE_YEAR_MESSAGES,
  NOUNS,
  PROMOTION_LABELS,
  YEAR_STATUS_LABELS,
  arabicCount,
  closeYearProblem,
  currentSchoolYear,
  gradeLabel,
  rolloverPlan,
  yearLabel,
  type PromotionOutcome,
} from "@akbadna/core";
import { AppText, Button, Card, EmptyState, Icon, Screen } from "@/components";
import { useAuth } from "@/lib/auth";
import { useActiveYear, useClass, useMemberships, useRoster } from "@/data/hooks";
import { closeYear } from "@/data/mutations";
import { alpha, color, font, radius, space } from "@/theme";

const OUTCOMES: PromotionOutcome[] = ["promote", "repeat", "graduate", "transfer"];

const SHORT: Record<PromotionOutcome, string> = {
  promote: "ينتقل",
  repeat: "يعيد",
  graduate: "يتخرّج",
  transfer: "منقول",
};

const DEMO_STUDENTS = [
  { kidId: "d1", name: "سعد الحربي", grade: 8 },
  { kidId: "d2", name: "نورة القحطاني", grade: 12 },
  { kidId: "d3", name: "فهد الشمري", grade: 8 },
  { kidId: "d4", name: "ريم الدوسري", grade: 8 },
  { kidId: "d5", name: "طالب بلا صف" },
];

/**
 * Ending the school year.
 *
 * This is the one screen that touches every child at once, so it shows the
 * whole thing before doing any of it: who moves up, who repeats, who graduates,
 * and — the part that matters — who the app refuses to decide for. A child with
 * no grade on file blocks the close rather than being swept along, because a
 * grade invented here becomes that child's record for good.
 *
 * Nothing is deleted. The closing year keeps its own enrolment record for every
 * child, so «كم غاب ابني في الصف الخامس؟» still has an answer years later.
 */
export default function YearEnd() {
  const { isDemo } = useAuth();
  const { data: memberships } = useMemberships();
  const mine =
    memberships.find((m) => m.role === "school_admin") ??
    memberships.find((m) => m.role === "teacher") ??
    memberships[0];
  const schoolId = mine?.schoolId;
  const classId = mine?.classIds[0];
  const { data: cls } = useClass(schoolId, classId);
  const { data: roster } = useRoster(cls?.studentIds ?? []);
  const year = useActiveYear(schoolId);

  const [overrides, setOverrides] = useState<Record<string, PromotionOutcome>>({});
  const [busy, setBusy] = useState(false);

  const students = isDemo
    ? DEMO_STUDENTS
    : roster.map((k) => ({
        kidId: k.id,
        name: k.name,
        grade: k.grade,
        enrolmentStatus: k.enrolmentStatus,
      }));

  const plan = rolloverPlan(students, overrides);
  const startYear = year ? Number(year.id) : currentSchoolYear();
  const problem = closeYearProblem({
    status: year?.status ?? "active",
    plan,
    now: Date.now(),
    endsAt: year?.endsAt,
    force: true, // The calendar is the school's business; the records are not.
  });

  const confirm = () => {
    const lines = [
      `${arabicCount(plan.counts.promote, NOUNS.student)} ينتقلون للصف التالي.`,
      plan.counts.repeat ? `${arabicCount(plan.counts.repeat, NOUNS.student)} يعيدون الصف.` : "",
      plan.counts.graduate ? `${arabicCount(plan.counts.graduate, NOUNS.student)} يتخرّجون.` : "",
      "",
      `يُفتح عام ${yearLabel(startYear + 1)} ويُحفظ سجل العام المنتهي كما هو.`,
    ].filter(Boolean);

    Alert.alert(`إنهاء عام ${yearLabel(startYear)}`, lines.join("\n"), [
      { text: "رجوع", style: "cancel" },
      { text: "إنهاء العام", style: "destructive", onPress: run },
    ]);
  };

  const run = async () => {
    setBusy(true);
    try {
      if (isDemo) {
        Alert.alert("وضع تجريبي", "سيُنفَّذ الترفيع عند الدخول بحساب مدرسة حقيقي.");
      } else if (schoolId) {
        const res = await closeYear({
          schoolId,
          yearId: year?.id ?? String(startYear),
          status: year?.status ?? "active",
          students,
          overrides,
          endsAt: year?.endsAt,
          force: true,
        });
        Alert.alert(
          "انتهى العام",
          `رُفِّع ${arabicCount(res.promoted, NOUNS.student)}، وتخرّج ${arabicCount(
            res.graduated,
            NOUNS.student,
          )}. العام الجديد ${yearLabel(Number(res.nextYearId))} جارٍ الآن.`,
        );
      }
      router.back();
    } catch (e) {
      Alert.alert("تعذّر إنهاء العام", e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  if (!schoolId && !isDemo) {
    return (
      <Screen>
        <EmptyState
          icon="calendar-outline"
          title="لا توجد مدرسة مرتبطة"
          subtitle="إنهاء العام من صلاحية المدرسة التي تُدرّس فيها."
        />
      </Screen>
    );
  }

  const tile = (label: string, n: number, tone: string) => (
    <View
      key={label}
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: space.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: alpha(tone, 0.3),
        backgroundColor: alpha(tone, 0.08),
      }}
    >
      <AppText style={{ fontFamily: font.family.numBold, fontSize: 20, color: tone }}>
        {String(n)}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingTop: space.md,
        }}
      >
        <AppText variant="title" style={{ flex: 1 }}>
          عام {yearLabel(startYear)}
        </AppText>
        <View
          style={{
            paddingHorizontal: space.sm,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor: color.moeGreenSoft,
          }}
        >
          <AppText variant="caption" color={color.moeGreen} weight="bold">
            {YEAR_STATUS_LABELS[year?.status ?? "active"]}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: space.sm, marginBlock: space.md }}>
        {tile("ينتقلون", plan.counts.promote, color.moeGreen)}
        {tile("يعيدون", plan.counts.repeat, color.warning)}
        {tile("يتخرّجون", plan.counts.graduate, color.primary)}
        {tile("بلا قرار", plan.needsReview.length, color.danger)}
      </View>

      {plan.needsReview.length > 0 && (
        <Card padding={space.md} style={{ marginBottom: space.md, borderColor: color.danger }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Icon name="alert-circle-outline" size={18} color={color.danger} />
            <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>
              {CLOSE_YEAR_MESSAGES.undecided} — الطالب بلا صف مسجَّل لا يُرفَّع تلقائيًا حتى لا
              يُسجَّل في صف لم يدرسه.
            </AppText>
          </View>
        </Card>
      )}

      <AppText variant="label" style={{ marginBottom: space.sm }}>
        مصير كل طالب:
      </AppText>

      {plan.rows.length === 0 ? (
        <EmptyState icon="people-outline" title="لا يوجد طلاب في هذا العام" />
      ) : (
        <View style={{ gap: space.sm }}>
          {plan.rows.map((row) => (
            <Card
              key={row.kidId}
              padding={space.md}
              style={row.outcome === null ? { borderColor: alpha(color.danger, 0.5) } : undefined}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <AppText variant="subtitle" style={{ flex: 1 }}>
                  {row.name ?? row.kidId}
                </AppText>
                <AppText variant="caption">
                  {row.fromGrade ? gradeLabel(row.fromGrade) : "لا صف مسجَّل"}
                </AppText>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: space.xs,
                  marginTop: space.sm,
                }}
              >
                {OUTCOMES.map((o) => {
                  const on = row.outcome === o;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => setOverrides((v) => ({ ...v, [row.kidId]: o }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${row.name ?? row.kidId}: ${PROMOTION_LABELS[o]}`}
                      style={{
                        width: "23.5%",
                        alignItems: "center",
                        paddingVertical: space.sm,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: on ? color.moeGreen : color.border,
                        backgroundColor: on ? color.moeGreenSoft : color.surface,
                      }}
                    >
                      <AppText
                        variant="label"
                        color={on ? color.moeGreen : color.textMuted}
                        weight={on ? "bold" : "regular"}
                      >
                        {SHORT[o]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {row.toGrade !== null && (
                <AppText variant="caption" style={{ marginTop: space.xs }}>
                  العام القادم: {gradeLabel(row.toGrade)}
                </AppText>
              )}
            </Card>
          ))}
        </View>
      )}

      <Button
        label="إنهاء العام وبدء العام التالي"
        icon="calendar-outline"
        loading={busy}
        disabled={problem !== null}
        onPress={confirm}
        style={{ marginTop: space.lg }}
      />

      {problem && (
        <AppText
          variant="caption"
          color={color.danger}
          style={{ textAlign: "center", marginTop: space.sm }}
        >
          {CLOSE_YEAR_MESSAGES[problem]}
        </AppText>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          marginTop: space.lg,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: alpha(color.moeGreen, 0.06),
          borderWidth: 1,
          borderColor: color.border,
        }}
      >
        <Icon name="archive-outline" size={16} color={color.textMuted} />
        <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>
          لا يُحذف شيء: يبقى سجل كل طالب في العام المنتهي — صفه وفصله وحضوره — ويُفتح له سجل جديد في
          العام القادم.
        </AppText>
      </View>
    </Screen>
  );
}
