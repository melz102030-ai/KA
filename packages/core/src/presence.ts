import type { GeoPoint } from "./common.js";
import type { AttendanceStatus } from "./enums.js";

/**
 * Where a student is right now, judged from the watch's last fix against the
 * school's campus fence. This is what paints the teacher's live roster:
 *
 *   present — inside the fence
 *   nearby  — outside it but within the approach band (arriving, at the gate,
 *             in the car park); the teacher decides whether that counts
 *   away    — beyond the band
 *   unknown — no fix, or one too old to trust
 *
 * Deliberately separate from AttendanceStatus: this is an observation, and the
 * mark the teacher submits is a decision. Conflating them would silently turn
 * a flat battery into an absence.
 */
export type LivePresence = "present" | "nearby" | "away" | "unknown";

/** Metres beyond the campus fence still counted as approaching. */
export const DEFAULT_NEARBY_BAND_M = 300;

/** A fix older than this tells us where the student *was*, not where they are. */
export const DEFAULT_STALE_AFTER_MS = 10 * 60 * 1000;

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceM(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type LivePresenceInput = {
  /** The watch's last known position, if any. */
  kidLocation?: GeoPoint;
  /** When that position was reported. */
  lastTelemetryAt?: number;
  /** The school's coordinates. Without them nothing can be judged. */
  schoolLocation?: GeoPoint;
  campusRadiusM?: number;
  nearbyBandM?: number;
  staleAfterMs?: number;
  now?: number;
};

/**
 * Classifies one student. Returns `unknown` rather than guessing whenever the
 * inputs cannot support a judgement — an unconfigured school, a watch that has
 * not reported, or a fix that has gone stale.
 */
export function livePresence(input: LivePresenceInput): LivePresence {
  const {
    kidLocation,
    lastTelemetryAt,
    schoolLocation,
    campusRadiusM = 150,
    nearbyBandM = DEFAULT_NEARBY_BAND_M,
    staleAfterMs = DEFAULT_STALE_AFTER_MS,
    now = Date.now(),
  } = input;

  if (!kidLocation || !schoolLocation) return "unknown";
  if (lastTelemetryAt !== undefined && now - lastTelemetryAt > staleAfterMs) return "unknown";

  const d = distanceM(kidLocation, schoolLocation);
  if (d <= campusRadiusM) return "present";
  if (d <= campusRadiusM + nearbyBandM) return "nearby";
  return "away";
}

/**
 * What the live reading suggests the teacher mark. `nearby` maps to "late"
 * because a student at the gate is not yet in class; `unknown` maps to nothing
 * at all, so a dead battery never auto-marks anyone absent.
 */
export function suggestedStatus(p: LivePresence): AttendanceStatus | undefined {
  if (p === "present") return "present";
  if (p === "nearby") return "late";
  if (p === "away") return "absent";
  return undefined;
}
