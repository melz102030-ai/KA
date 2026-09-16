import { z } from "zod";
import { GRADE_MAX, GRADE_MIN, type GradeNumber } from "./education.js";
import type { EnrolmentStatus } from "./trust.js";

/**
 * The school year, and the day it ends.
 *
 * Every other part of the app assumes "now": this class, this roster, this
 * attendance. A school does not work that way — it empties every summer and
 * refills with the same children one grade higher, and the year that just ended
 * has to stay readable afterwards. A parent asking «كم غاب ابني في الصف الخامس؟»
 * is asking about a year that is over.
 *
 * So promotion is never a rewrite. Closing a year stamps an outcome on each
 * enrolment record and opens a new record in the new year; the old grade, the
 * old class and the old attendance stay exactly where they were.
 */

/* ── The year itself ─────────────────────────────────────────────────────── */

/** planned → active → archived. A school has at most one active year. */
export const YearStatus = z.enum(["planned", "active", "archived"]);
export type YearStatus = z.infer<typeof YearStatus>;

export const YEAR_STATUS_LABELS: Record<YearStatus, string> = {
  planned: "لم يبدأ بعد",
  active: "جارٍ",
  archived: "منتهٍ",
};

/**
 * A Saudi school year is named by the two Hijri years it straddles: it opens in
 * ١٤٤٧ and closes in ١٤٤٨. The id is the opening year, which is what everyone
 * calls it, and the label spells out both.
 */
export function yearLabel(startHijriYear: number): string {
  return `${startHijriYear} / ${startHijriYear + 1} هـ`;
}

export const nextYearId = (startHijriYear: number): number => startHijriYear + 1;

/**
 * The Hijri year to offer as the default when a school opens a new year.
 *
 * Only a suggestion: the Saudi academic year is labelled in Hijri but no longer
 * pinned to Hijri months — it opens in August and the Hijri date of that August
 * moves every year — so the school confirms or changes it. Deriving it from the
 * month here would look precise and be wrong for several weeks a year.
 */
export function currentSchoolYear(now: number = Date.now()): number {
  const year = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(now));
  return Number(year.replace(/\D/g, ""));
}

/* ── What happens to each child ──────────────────────────────────────────── */

/**
 * The four ends a child's year can come to. `review` is not one of them: it is
 * the absence of a decision, and it exists so an incomplete record stops the
 * rollover instead of being guessed at.
 */
export const PromotionOutcome = z.enum(["promote", "repeat", "graduate", "transfer"]);
export type PromotionOutcome = z.infer<typeof PromotionOutcome>;

export const PROMOTION_LABELS: Record<PromotionOutcome, string> = {
  promote: "ينتقل للصف التالي",
  repeat: "يعيد الصف",
  graduate: "يتخرّج",
  transfer: "منقول لمدرسة أخرى",
};

export const LAST_GRADE: GradeNumber = GRADE_MAX;

/**
 * What should happen to this child if nobody says otherwise.
 *
 * The default is the common case — everyone moves up, the twelfth graduates —
 * but a child with no grade on file returns null rather than a guess. The
 * screen shows those separately: promoting a child into a grade the system
 * invented is how a record quietly becomes wrong forever.
 */
export function defaultOutcome(grade: number | undefined): PromotionOutcome | null {
  if (grade === undefined || !Number.isInteger(grade) || grade < GRADE_MIN || grade > LAST_GRADE) {
    return null;
  }
  return grade === LAST_GRADE ? "graduate" : "promote";
}

/**
 * The grade a child sits in next year, or null when they leave the school's
 * grade ladder altogether (graduation, transfer).
 */
export function gradeAfter(grade: number, outcome: PromotionOutcome): GradeNumber | null {
  if (outcome === "repeat") return grade as GradeNumber;
  if (outcome === "promote") return grade < LAST_GRADE ? ((grade + 1) as GradeNumber) : null;
  return null;
}

/** How the closed year's enrolment record is stamped. */
export function closingStatus(outcome: PromotionOutcome): EnrolmentStatus {
  if (outcome === "graduate") return "graduated";
  if (outcome === "transfer") return "transferred";
  return "active";
}

/** Whether the child carries on into next year's rosters at all. */
export const continuesNextYear = (outcome: PromotionOutcome): boolean =>
  outcome === "promote" || outcome === "repeat";

/* ── The rollover ────────────────────────────────────────────────────────── */

export type RolloverStudent = {
  kidId: string;
  name?: string;
  grade?: number;
  classId?: string;
  enrolmentStatus?: EnrolmentStatus;
};

export type RolloverRow = {
  kidId: string;
  name?: string;
  fromGrade?: number;
  outcome: PromotionOutcome | null;
  toGrade: GradeNumber | null;
  /** The status stamped on the record being closed. */
  closesAs: EnrolmentStatus | null;
};

export type RolloverPlan = {
  rows: RolloverRow[];
  counts: Record<PromotionOutcome, number>;
  /** Children whose record is too incomplete to decide. */
  needsReview: RolloverRow[];
  /** True only when every child has an outcome. */
  ready: boolean;
};

/**
 * Builds the whole year-end in one object so the teacher sees it before any of
 * it happens: every child, what becomes of them, and what is still undecided.
 *
 * Children already closed out during the year — transferred away, rejected —
 * are left alone; their year ended when it ended.
 */
export function rolloverPlan(
  students: RolloverStudent[],
  overrides: Record<string, PromotionOutcome> = {},
): RolloverPlan {
  const counts: Record<PromotionOutcome, number> = {
    promote: 0,
    repeat: 0,
    graduate: 0,
    transfer: 0,
  };

  const rows: RolloverRow[] = students
    .filter((s) => (s.enrolmentStatus ?? "active") === "active")
    .map((s) => {
      const outcome = overrides[s.kidId] ?? defaultOutcome(s.grade);
      if (outcome) counts[outcome] += 1;
      return {
        kidId: s.kidId,
        name: s.name,
        fromGrade: s.grade,
        outcome,
        toGrade: outcome && s.grade !== undefined ? gradeAfter(s.grade, outcome) : null,
        closesAs: outcome ? closingStatus(outcome) : null,
      };
    });

  const needsReview = rows.filter((r) => r.outcome === null);
  return { rows, counts, needsReview, ready: rows.length > 0 && needsReview.length === 0 };
}

/* ── Guards ──────────────────────────────────────────────────────────────── */

export type CloseYearProblem = "not-active" | "nothing-to-close" | "undecided" | "too-early";

export const CLOSE_YEAR_MESSAGES: Record<CloseYearProblem, string> = {
  "not-active": "لا يمكن إنهاء عام لم يبدأ أو انتهى أصلًا",
  "nothing-to-close": "لا يوجد طلاب في هذا العام",
  undecided: "بعض الطلاب بلا قرار — حدّد مصير كل طالب أولًا",
  "too-early": "لم ينتهِ العام الدراسي بعد",
};

/**
 * Whether the year may be closed now.
 *
 * `force` is the head teacher overriding the calendar — a year can end early —
 * but it deliberately cannot override an undecided child, because that is the
 * one mistake the records never recover from.
 */
export function closeYearProblem(input: {
  status: YearStatus;
  plan: RolloverPlan;
  now: number;
  endsAt?: number;
  force?: boolean;
}): CloseYearProblem | null {
  if (input.status !== "active") return "not-active";
  if (input.plan.rows.length === 0) return "nothing-to-close";
  if (input.plan.needsReview.length > 0) return "undecided";
  if (!input.force && input.endsAt !== undefined && input.now < input.endsAt) return "too-early";
  return null;
}

/**
 * The grade a class itself moves up to, or null when the class retires: a
 * الثالث ثانوي section has nobody left to carry forward.
 *
 * Schools differ on whether the class travels with its students or the students
 * are redistributed, so this only offers the grade — the roster is built from
 * the rollover plan, not from last year's class list.
 */
export function nextClassGrade(gradeNumber: number | undefined): GradeNumber | null {
  if (gradeNumber === undefined || !Number.isInteger(gradeNumber)) return null;
  if (gradeNumber < GRADE_MIN || gradeNumber >= LAST_GRADE) return null;
  return (gradeNumber + 1) as GradeNumber;
}
