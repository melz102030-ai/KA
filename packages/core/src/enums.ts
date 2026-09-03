import { z } from "zod";

/** Who a person is in the system. A single account may hold several roles. */
export const Role = z.enum(["parent", "teacher", "school_admin", "student", "driver"]);
export type Role = z.infer<typeof Role>;

/** Coarse presence of a kid during the school day (derived from schedule + telemetry). */
export const KidPresence = z.enum([
  "home",
  "commuting",
  "in_class",
  "break",
  "activity",
  "left_school",
  "unknown",
]);
export type KidPresence = z.infer<typeof KidPresence>;

/** Attendance mark for one kid in one session. */
export const AttendanceStatus = z.enum(["present", "late", "absent", "excused"]);
export type AttendanceStatus = z.infer<typeof AttendanceStatus>;

/** How an attendance mark was produced. */
export const AttendanceMethod = z.enum([
  "watch_scan",
  "bulk_watch_scan",
  "manual",
  "auto_geofence",
]);
export type AttendanceMethod = z.infer<typeof AttendanceMethod>;

/** Message / thread categories — drive colour, icon and routing. */
export const MessageChannel = z.enum(["school", "teacher", "carpool", "alert", "system", "direct"]);
export type MessageChannel = z.infer<typeof MessageChannel>;

/** Operational alerts raised for a kid/watch. */
export const AlertKind = z.enum([
  "sos",
  "geofence_exit",
  "geofence_enter",
  "low_battery",
  "watch_offline",
  "abnormal_heart_rate",
  "abnormal_temperature",
  "fall_detected",
  "sim_removed",
]);
export type AlertKind = z.infer<typeof AlertKind>;

export const AlertSeverity = z.enum(["critical", "warning", "info"]);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertState = z.enum(["open", "acknowledged", "resolved"]);
export type AlertState = z.infer<typeof AlertState>;

/** Carpool trip direction. */
export const TripDirection = z.enum(["to_school", "from_school", "round_trip"]);
export type TripDirection = z.infer<typeof TripDirection>;

/** Lifecycle of a carpool trip. */
export const TripStatus = z.enum([
  "offered",
  "forming",
  "confirmed",
  "active",
  "completed",
  "cancelled",
]);
export type TripStatus = z.infer<typeof TripStatus>;

/** Lifecycle of a request to join a trip or add a contact. */
export const RequestStatus = z.enum(["pending", "accepted", "rejected", "cancelled", "expired"]);
export type RequestStatus = z.infer<typeof RequestStatus>;

/** Watch pairing lifecycle. */
export const WatchPairingState = z.enum(["unpaired", "pending", "paired", "suspended", "lost"]);
export type WatchPairingState = z.infer<typeof WatchPairingState>;

/** Connectivity of a watch as last reported. */
export const WatchLinkState = z.enum(["online", "idle", "offline"]);
export type WatchLinkState = z.infer<typeof WatchLinkState>;

/** Wallet transaction kinds. */
export const WalletTxKind = z.enum(["topup", "purchase", "refund", "reward", "adjustment"]);
export type WalletTxKind = z.infer<typeof WalletTxKind>;

/** Supported locales. Arabic is primary and RTL. */
export const Locale = z.enum(["ar", "en"]);
export type Locale = z.infer<typeof Locale>;
