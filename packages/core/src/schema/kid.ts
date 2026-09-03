import { z } from "zod";
import { AkbadnaId, Audit, EpochMillis, GeoPoint } from "../common.js";
import { KidPresence } from "../enums.js";

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
  schoolId: z.string().optional(),
  classId: z.string().optional(),
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
