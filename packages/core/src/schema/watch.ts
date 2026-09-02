import { z } from "zod";
import { AkbadnaId, Audit, EpochMillis, GeoPoint, Imei, SaudiPhone } from "../common.js";
import { WatchLinkState, WatchPairingState } from "../enums.js";

/** watches/{watchId} — a physical Wonlex KT37 bound to a kid. */
export const Watch = Audit.extend({
  id: z.string().min(1),
  model: z.literal("KT37").default("KT37"),
  imei: Imei,
  simNumber: SaudiPhone.optional(),
  carrier: z.enum(["STC", "Zain", "Mobily"]).optional(),
  firmware: z.string().optional(),
  appVersion: z.string().optional(), // companion APK build on the watch
  kidId: z.string().optional(),
  akbadnaId: AkbadnaId,
  pairing: WatchPairingState.default("unpaired"),
  /** Short-lived code shown during QR/manual pairing. */
  pairingCode: z.string().optional(),
  pairingCodeExpiresAt: EpochMillis.optional(),
  link: WatchLinkState.default("offline"),
  lastSeenAt: EpochMillis.optional(),
  lastLocation: GeoPoint.optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  settings: z
    .object({
      locationIntervalSec: z.number().int().min(10).default(30),
      classModeEnabled: z.boolean().default(true),
      dndWindows: z.array(z.object({ start: z.string(), end: z.string() })).default([]),
      sosNumbers: z.array(SaudiPhone).max(3).default([]),
      allowedContacts: z.number().int().max(10).default(10),
    })
    .default({}),
});
export type Watch = z.infer<typeof Watch>;

/**
 * telemetry/{watchId}/packets/{autoId} — raw device reports (append-only,
 * TTL-expired after retention window). One packet per upload interval.
 * Matches the KT37 companion-APK payload.
 */
export const TelemetryPacket = z.object({
  watchId: z.string().min(1),
  imei: Imei,
  at: EpochMillis, // device clock, server-corrected on ingest
  receivedAt: EpochMillis,
  location: GeoPoint.optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  charging: z.boolean().optional(),
  heartRate: z.number().positive().optional(),
  skinTempC: z.number().optional(),
  steps: z.number().int().nonnegative().optional(),
  signalBars: z.number().int().min(0).max(5).optional(),
  sos: z.boolean().default(false),
  fall: z.boolean().default(false),
  simPresent: z.boolean().optional(),
  source: z.enum(["apk", "sms", "setracker_bridge"]).default("apk"),
});
export type TelemetryPacket = z.infer<typeof TelemetryPacket>;

/** Hourly/daily aggregates for charts, written by a scheduled function. */
export const VitalsRollup = z.object({
  watchId: z.string().min(1),
  kidId: z.string().min(1),
  bucketStart: EpochMillis,
  bucketKind: z.enum(["hour", "day"]),
  heartRate: z.object({ min: z.number(), max: z.number(), avg: z.number() }).optional(),
  steps: z.number().int().nonnegative().optional(),
  batteryMinPct: z.number().min(0).max(100).optional(),
  distanceM: z.number().nonnegative().optional(),
  packets: z.number().int().nonnegative(),
});
export type VitalsRollup = z.infer<typeof VitalsRollup>;
