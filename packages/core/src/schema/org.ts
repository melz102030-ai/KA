import { z } from "zod";
import { Audit, ClockTime, GeoPoint, WeekDay } from "../common.js";
import { GradeNumber, SchoolSegment } from "../education.js";

/** schools/{schoolId} */
export const School = Audit.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Ministry of Education "Noor" school id, when linked. */
  noorSchoolId: z.string().optional(),
  /**
   * Boys' or girls'. Never both: a Saudi school takes one and is staffed
   * accordingly, and this is what a child's enrolment is checked against.
   */
  segment: SchoolSegment.optional(),
  location: GeoPoint.optional(),
  /** Default campus fence; individual gates live in `geofences`. */
  campusRadiusM: z.number().positive().default(150),
  timezone: z.string().default("Asia/Riyadh"),
  weekDays: z.array(WeekDay).default([0, 1, 2, 3, 4]),
  adminUids: z.array(z.string()).default([]),
});
export type School = z.infer<typeof School>;

/** joinCodes/{CODE} — short-lived pointer used during onboarding. */
export const JoinCodeDoc = Audit.extend({
  code: z.string().min(4),
  schoolId: z.string().min(1),
  classId: z.string().optional(),
  role: z.enum(["parent", "teacher"]),
  createdByUid: z.string().min(1),
  expiresAt: z.number().int().nonnegative().optional(),
  uses: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().optional(),
});
export type JoinCodeDoc = z.infer<typeof JoinCodeDoc>;

/** One slot in the daily timetable. */
export const SchedulePeriod = z.object({
  index: z.number().int().nonnegative(),
  name: z.string().min(1),
  start: ClockTime,
  end: ClockTime,
  kind: z.enum(["assembly", "lesson", "break", "dismissal"]).default("lesson"),
  subjectId: z.string().optional(),
});
export type SchedulePeriod = z.infer<typeof SchedulePeriod>;

/** schools/{schoolId}/classes/{classId} */
export const SchoolClass = Audit.extend({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  name: z.string().min(1), // "الأول متوسط - أ"
  /** 1-12. `gradeText` keeps whatever a school typed before this existed. */
  gradeNumber: GradeNumber.optional(),
  grade: z.string().min(1),
  homeroomTeacherId: z.string().optional(),
  teacherIds: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  /** Timetable keyed by week day (0..6). */
  schedule: z.record(z.string(), z.array(SchedulePeriod)).default({}),
});
export type SchoolClass = z.infer<typeof SchoolClass>;
