import { z } from "zod";
import { Audit, EpochMillis } from "../common.js";
import { AttendanceMethod, AttendanceStatus } from "../enums.js";

/**
 * schools/{schoolId}/attendanceSessions/{sessionId}
 * One per class per school-day (optionally per period).
 */
export const AttendanceSession = Audit.extend({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  date: z.string().date(), // YYYY-MM-DD, school timezone
  periodIndex: z.number().int().nonnegative().optional(),
  takenBy: z.string().optional(),
  finalizedAt: EpochMillis.optional(),
  counts: z
    .object({
      present: z.number().int().nonnegative(),
      late: z.number().int().nonnegative(),
      absent: z.number().int().nonnegative(),
      excused: z.number().int().nonnegative(),
    })
    .default({ present: 0, late: 0, absent: 0, excused: 0 }),
});
export type AttendanceSession = z.infer<typeof AttendanceSession>;

/** .../attendanceSessions/{sessionId}/records/{kidId} */
export const AttendanceRecord = z.object({
  sessionId: z.string().min(1),
  kidId: z.string().min(1),
  classId: z.string().min(1),
  status: AttendanceStatus,
  method: AttendanceMethod,
  markedBy: z.string().optional(),
  markedAt: EpochMillis,
  /** Present when method is watch_scan / auto_geofence. */
  watchId: z.string().optional(),
  note: z.string().max(280).optional(),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecord>;

/** Rolling per-kid attendance stats, maintained by a function on record writes. */
export const AttendanceSummary = z.object({
  kidId: z.string().min(1),
  classId: z.string().min(1),
  termId: z.string().optional(),
  present: z.number().int().nonnegative().default(0),
  late: z.number().int().nonnegative().default(0),
  absent: z.number().int().nonnegative().default(0),
  excused: z.number().int().nonnegative().default(0),
  ratePct: z.number().min(0).max(100).default(100),
  updatedAt: EpochMillis,
});
export type AttendanceSummary = z.infer<typeof AttendanceSummary>;

/** Teacher-issued emoji reward/boost, mirrored to the kid's watch + parent app. */
export const KidReward = Audit.extend({
  id: z.string().min(1),
  kidId: z.string().min(1),
  classId: z.string().min(1),
  issuedBy: z.string().min(1),
  rewardEmoji: z.string().emoji().optional(),
  boostEmoji: z.string().emoji().optional(),
  note: z.string().max(280).optional(),
  points: z.number().int().default(0),
});
export type KidReward = z.infer<typeof KidReward>;
