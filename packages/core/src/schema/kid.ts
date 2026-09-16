import { z } from "zod";
import { AkbadnaId, Audit, EpochMillis, GeoPoint } from "../common.js";
import { KidPresence } from "../enums.js";
import { Gender, GradeNumber } from "../education.js";
import { EnrolmentStatus } from "../trust.js";

/** Denormalised, fast-changing snapshot kept on the kid doc for cheap list reads. */
export const KidLiveState = z.object({
  presence: KidPresence.default("unknown"),
  heartRate: z.number().positive().optional(),
  skinTempC: z.number().optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  steps: z.number().int().nonnegative().optional(),
  location: GeoPoint.optional(),
  watchOnline: z.boolean().default(false),
  lastTelemetryAt: EpochMillis.optional(),
});
export type KidLiveState = z.infer<typeof KidLiveState>;

/**
 * kids/{kidId} — a child tracked in the system.
 * `guardianUids` gates parent access; `watchId` links the paired device.
 */
export const Kid = Audit.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Optional avatar glyph; the app renders initials, so this is not required. */
  avatarGlyph: z.string().optional(),
  birthDate: z.string().date().optional(),
  /** Decides which school this child can be enrolled in — see canEnrol. */
  gender: Gender.optional(),
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  /**
   * A parent asks to join a class; the teacher admits. Starts "pending" so a
   * child never lands in a roster on their family's say-so alone.
   */
  enrolmentStatus: EnrolmentStatus.default("pending"),
  enrolmentRequestedAt: EpochMillis.optional(),
  enrolmentDecidedBy: z.string().optional(),
  /** 1-12 across the three stages. The Arabic name is derived, never stored. */
  grade: GradeNumber.optional(),
  /** Free-text fallback for records imported before `grade` existed. */
  gradeLabel: z.string().optional(),
  noorStudentId: z.string().optional(),
  guardianUids: z.array(z.string()).min(1),
  watchId: z.string().optional(),
  akbadnaId: AkbadnaId,
  live: KidLiveState.default({ presence: "unknown", watchOnline: false }),
  /** Per-kid override of alert thresholds; falls back to school defaults. */
  vitalsThresholds: z
    .object({
      heartRateMax: z.number().positive().default(140),
      heartRateMin: z.number().positive().default(50),
      skinTempMaxC: z.number().default(38.5),
    })
    .partial()
    .optional(),
});
export type Kid = z.infer<typeof Kid>;
