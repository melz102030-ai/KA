import { z } from "zod";

/**
 * The shape of Saudi general education, and the rule that follows from it.
 *
 * Schools are single-segment: a بنين school teaches boys and is staffed by men,
 * a بنات school teaches girls and is staffed by women. A child therefore cannot
 * be enrolled anywhere that does not match, and a parent with children on both
 * sides is following two separate institutions — different buildings, different
 * staff, often different timetables. The app has to treat that as the normal
 * case rather than an edge one.
 */

export const Gender = z.enum(["boy", "girl"]);
export type Gender = z.infer<typeof Gender>;

/** Which children a school takes. One value per school, never both. */
export const SchoolSegment = z.enum(["boys", "girls"]);
export type SchoolSegment = z.infer<typeof SchoolSegment>;

export const Stage = z.enum(["primary", "intermediate", "secondary"]);
export type Stage = z.infer<typeof Stage>;

export const SEGMENT_LABELS: Record<SchoolSegment, string> = {
  boys: "بنين",
  girls: "بنات",
};

export const GENDER_LABELS: Record<Gender, string> = {
  boy: "ابن",
  girl: "ابنة",
};

export const STAGE_LABELS: Record<Stage, string> = {
  primary: "ابتدائي",
  intermediate: "متوسط",
  secondary: "ثانوي",
};

/** The segment a child belongs in. The only mapping there is. */
export const segmentForGender = (g: Gender): SchoolSegment => (g === "boy" ? "boys" : "girls");

/** Whether this child may be enrolled in this school. */
export const canEnrol = (childGender: Gender, schoolSegment: SchoolSegment): boolean =>
  segmentForGender(childGender) === schoolSegment;

/* ── Grades ──────────────────────────────────────────────────────────────
 * Numbered 1-12 across the three stages: 1-6 ابتدائي, 7-9 متوسط, 10-12 ثانوي.
 * A single number is what sorts and compares cleanly; the Arabic name a parent
 * reads ("الأول المتوسط") is derived from it rather than stored as free text,
 * so two schools cannot spell the same grade differently.
 */

export const GRADE_MIN = 1;
export const GRADE_MAX = 12;

export const GradeNumber = z.number().int().min(GRADE_MIN).max(GRADE_MAX);
export type GradeNumber = z.infer<typeof GradeNumber>;

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"] as const;

export function stageOfGrade(grade: number): Stage {
  if (grade <= 6) return "primary";
  if (grade <= 9) return "intermediate";
  return "secondary";
}

/** Where the grade sits inside its own stage: 1-6, 1-3, 1-3. */
export function gradeWithinStage(grade: number): number {
  if (grade <= 6) return grade;
  if (grade <= 9) return grade - 6;
  return grade - 9;
}

/** e.g. 8 → "الثاني المتوسط" */
export function gradeLabel(grade: number): string {
  const parsed = GradeNumber.safeParse(grade);
  if (!parsed.success) return "";
  const ordinal = ORDINALS[gradeWithinStage(grade) - 1]!;
  return `${ordinal} ${STAGE_LABELS[stageOfGrade(grade)]}`;
}

/** e.g. (8, "أ") → "الثاني المتوسط - أ" */
export function classLabel(grade: number, section?: string): string {
  const base = gradeLabel(grade);
  if (!base) return "";
  return section ? `${base} - ${section}` : base;
}

/** Every grade, for a picker. */
export const ALL_GRADES: { grade: number; stage: Stage; label: string }[] = Array.from(
  { length: GRADE_MAX },
  (_, i) => {
    const grade = i + 1;
    return { grade, stage: stageOfGrade(grade), label: gradeLabel(grade) };
  },
);

export const GRADES_BY_STAGE: Record<Stage, { grade: number; label: string }[]> = {
  primary: ALL_GRADES.filter((g) => g.stage === "primary"),
  intermediate: ALL_GRADES.filter((g) => g.stage === "intermediate"),
  secondary: ALL_GRADES.filter((g) => g.stage === "secondary"),
};

/* ── Grouping a parent's children ───────────────────────────────────────── */

export type ChildLike = { id: string; gender?: Gender; grade?: number; schoolId?: string };

export type ChildGroup<T> = {
  segment: SchoolSegment;
  stage: Stage;
  /** Stable key for a list: "boys:intermediate". */
  key: string;
  label: string;
  children: T[];
};

/**
 * Buckets children by segment then stage, which is how a parent actually holds
 * them in mind: the boys' school run and the girls' school run are separate
 * errands, and within each, a six-year-old and a sixteen-year-old need
 * different things.
 *
 * Groups come back in a fixed order — boys then girls, youngest stage first —
 * so the list does not reshuffle when a child changes school. Children with no
 * gender or grade recorded yet are returned separately rather than guessed at.
 */
export function groupChildren<T extends ChildLike>(
  children: T[],
): { groups: ChildGroup<T>[]; unsorted: T[] } {
  const order: [SchoolSegment, Stage][] = [
    ["boys", "primary"],
    ["boys", "intermediate"],
    ["boys", "secondary"],
    ["girls", "primary"],
    ["girls", "intermediate"],
    ["girls", "secondary"],
  ];

  const unsorted = children.filter((c) => !c.gender || c.grade === undefined);
  const groups: ChildGroup<T>[] = [];

  for (const [segment, stage] of order) {
    const members = children.filter(
      (c) =>
        c.gender !== undefined &&
        c.grade !== undefined &&
        segmentForGender(c.gender) === segment &&
        stageOfGrade(c.grade) === stage,
    );
    if (!members.length) continue;
    groups.push({
      segment,
      stage,
      key: `${segment}:${stage}`,
      label: `${STAGE_LABELS[stage]} ${SEGMENT_LABELS[segment]}`,
      children: members.slice().sort((a, b) => (a.grade ?? 0) - (b.grade ?? 0)),
    });
  }

  return { groups, unsorted };
}

/** Which segments a parent actually has children in. Drives whether to filter. */
export function segmentsPresent(children: ChildLike[]): SchoolSegment[] {
  const found = new Set<SchoolSegment>();
  for (const c of children) if (c.gender) found.add(segmentForGender(c.gender));
  return (["boys", "girls"] as const).filter((s) => found.has(s));
}

/* ── Timetables ──────────────────────────────────────────────────────────── */

export type PeriodDraft = { name: string; start: string; end: string };

export type ScheduleProblem =
  | { kind: "empty" }
  | { kind: "bad-time"; index: number }
  | { kind: "backwards"; index: number }
  | { kind: "overlap"; index: number }
  | { kind: "no-name"; index: number };

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const SCHEDULE_MESSAGES: Record<ScheduleProblem["kind"], string> = {
  empty: "أضف حصة واحدة على الأقل",
  "bad-time": "الوقت بصيغة ٢٤ ساعة مثل 07:30",
  backwards: "وقت النهاية قبل البداية",
  overlap: "هذه الحصة تتداخل مع التي قبلها",
  "no-name": "اكتب اسم الحصة",
};

/**
 * Checks a timetable before it is saved.
 *
 * Overlap is the one that matters. `currentPeriod` returns the first period
 * containing the moment, so two that overlap make "الحصة الحالية" depend on
 * array order — the teacher would see one period while the class sits in
 * another, and nothing would look broken enough to report.
 *
 * Returns every problem, not the first, so a teacher fixes the whole form in
 * one pass instead of being sent back repeatedly.
 */
export function validateSchedule(periods: PeriodDraft[]): ScheduleProblem[] {
  if (!periods.length) return [{ kind: "empty" }];

  const problems: ScheduleProblem[] = [];
  periods.forEach((p, i) => {
    if (!p.name.trim()) problems.push({ kind: "no-name", index: i });
    if (!CLOCK.test(p.start) || !CLOCK.test(p.end)) {
      problems.push({ kind: "bad-time", index: i });
      return;
    }
    if (toMinutes(p.end) <= toMinutes(p.start)) problems.push({ kind: "backwards", index: i });
  });

  // Compare in clock order, so a teacher who types the rows out of sequence is
  // told about a real clash rather than about their typing order.
  const ordered = periods
    .map((p, index) => ({ ...p, index }))
    .filter((p) => CLOCK.test(p.start) && CLOCK.test(p.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  for (let i = 1; i < ordered.length; i++) {
    if (toMinutes(ordered[i]!.start) < toMinutes(ordered[i - 1]!.end)) {
      problems.push({ kind: "overlap", index: ordered[i]!.index });
    }
  }
  return problems;
}

/** A starting point a teacher edits, rather than an empty form. */
export const DEFAULT_PERIODS: PeriodDraft[] = [
  { name: "الطابور", start: "06:45", end: "07:00" },
  { name: "الحصة الأولى", start: "07:00", end: "07:45" },
  { name: "الحصة الثانية", start: "07:45", end: "08:30" },
  { name: "استراحة", start: "08:30", end: "08:50" },
  { name: "الحصة الثالثة", start: "08:50", end: "09:35" },
  { name: "الحصة الرابعة", start: "09:35", end: "10:20" },
  { name: "استراحة كبرى", start: "10:20", end: "10:50" },
  { name: "الحصة الخامسة", start: "10:50", end: "11:35" },
  { name: "الحصة السادسة", start: "11:35", end: "12:20" },
  { name: "الانصراف", start: "12:20", end: "12:30" },
];
