import { z } from "zod";
import { Audit, ClockTime, GeoPoint, WeekDay } from "../common.js";

/** schools/{schoolId} */
export const School = Audit.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Ministry of Education "Noor" school id, when linked. */
  noorSchoolId: z.string().optional(),
  location: GeoPoint.optional(),
  /** Default campus fence; individual gates live in `geofences`. */
  campusRadiusM: z.number().positive().default(150),
  timezone: z.string().default("Asia/Riyadh"),
  weekDays: z.array(WeekDay).default([0, 1, 2, 3, 4]),
});
export type School = z.infer<typeof School>;

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
  name: z.string().min(1), // "أول متوسط - أ"
  grade: z.string().min(1),
  homeroomTeacherId: z.string().optional(),
  teacherIds: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  /** Timetable keyed by week day (0..6). */
  schedule: z.record(z.string(), z.array(SchedulePeriod)).default({}),
});
export type SchoolClass = z.infer<typeof SchoolClass>;
