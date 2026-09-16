import { z } from "zod";
import { Audit, EpochMillis } from "../common.js";
import { GradeNumber } from "../education.js";
import { EnrolmentStatus } from "../trust.js";
import { PromotionOutcome, YearStatus } from "../year.js";

/**
 * schools/{schoolId}/years/{yearId} — one academic year, e.g. "1447".
 *
 * The id is the Hijri year the school year opens in, so it sorts correctly as a
 * string and reads the way a Saudi parent says it.
 */
export const AcademicYear = Audit.extend({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  /** "1447 / 1448 هـ" */
  label: z.string().min(1),
  status: YearStatus.default("planned"),
  startsAt: EpochMillis,
  endsAt: EpochMillis,
  closedAt: EpochMillis.optional(),
  closedBy: z.string().optional(),
});
export type AcademicYear = z.infer<typeof AcademicYear>;

/**
 * schools/{schoolId}/years/{yearId}/enrolments/{kidId} — what a child was, in
 * a year that may be over.
 *
 * This is the record the app reads when a parent asks about a past year. The
 * kid document always says where the child is *now*; only this says where they
 * were. Closing a year writes the outcome here and never edits an earlier year.
 */
export const EnrolmentRecord = Audit.extend({
  id: z.string().min(1),
  kidId: z.string().min(1),
  schoolId: z.string().min(1),
  yearId: z.string().min(1),
  classId: z.string().optional(),
  grade: GradeNumber.optional(),
  status: EnrolmentStatus.default("active"),
  /** Written when the year closes; absent while the year is running. */
  outcome: PromotionOutcome.optional(),
  decidedBy: z.string().optional(),
  decidedAt: EpochMillis.optional(),
});
export type EnrolmentRecord = z.infer<typeof EnrolmentRecord>;
