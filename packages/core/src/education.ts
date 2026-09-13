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
