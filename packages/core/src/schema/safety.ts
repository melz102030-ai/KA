import { z } from "zod";
import { AkbadnaId, Audit, EpochMillis, GeoPoint } from "../common.js";
import { AlertKind, AlertSeverity, AlertState, RequestStatus } from "../enums.js";

/** geofences/{geofenceId} — circular zone with enter/exit alerting. */
export const Geofence = Audit.extend({
  id: z.string().min(1),
  name: z.string().min(1), // "المنزل", "البوابة الرئيسية"
  center: GeoPoint,
  radiusM: z.number().positive(),
  /** Scope: a specific kid, a whole school, or a class. */
  scope: z.object({ kind: z.enum(["kid", "school", "class"]), id: z.string() }),
  alertOn: z.array(z.enum(["enter", "exit"])).default(["exit"]),
  activeWindows: z
    .array(z.object({ weekDays: z.array(z.number()), start: z.string(), end: z.string() }))
    .default([]),
  enabled: z.boolean().default(true),
});
export type Geofence = z.infer<typeof Geofence>;

/** alerts/{alertId} — an operational event needing attention. */
export const Alert = Audit.extend({
  id: z.string().min(1),
  kind: AlertKind,
  severity: AlertSeverity,
  state: AlertState.default("open"),
  kidId: z.string().optional(),
  watchId: z.string().optional(),
  schoolId: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  location: GeoPoint.optional(),
  raisedAt: EpochMillis,
  /** uids notified via push. */
  notifiedUids: z.array(z.string()).default([]),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: EpochMillis.optional(),
  resolvedAt: EpochMillis.optional(),
});
export type Alert = z.infer<typeof Alert>;

/**
 * contacts/{contactId} — a link between a watch (by Akbadna ID) and a person,
 * so kids/guardians can connect without sharing phone numbers.
 */
export const Contact = Audit.extend({
  id: z.string().min(1),
  ownerKidId: z.string().min(1),
  akbadnaId: AkbadnaId, // the other party
  displayName: z.string().min(1),
  relation: z.string().optional(),
  status: RequestStatus.default("pending"),
  approvedBy: z.string().optional(),
});
export type Contact = z.infer<typeof Contact>;

/** Distance in metres between two points (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** True when `p` lies inside the fence. */
export function isInside(fence: Pick<Geofence, "center" | "radiusM">, p: GeoPoint): boolean {
  return distanceMeters(fence.center, p) <= fence.radiusM;
}
