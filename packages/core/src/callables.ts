/**
 * Cloud Functions callable contracts. Both the app and `@akbadna/functions`
 * import these so requests/responses stay in lock-step.
 */
import { z } from "zod";
import { AkbadnaId, Imei, SaudiPhone } from "./common.js";
import { AttendanceStatus, Role, TripDirection } from "./enums.js";

export const callables = {
  /** Create/refresh the caller's profile after first sign-in. */
  bootstrapProfile: {
    name: "bootstrapProfile",
    request: z.object({
      displayName: z.string().min(1),
      activeRole: Role,
      locale: z.enum(["ar", "en"]).default("ar"),
    }),
    response: z.object({ uid: z.string(), created: z.boolean() }),
  },

  /**
   * Dev helper: seed a demo school + class + kids owned by the caller so the
   * app shows real Firestore data. Safe to call repeatedly (returns the same ids).
   */
  seedDemoSchool: {
    name: "seedDemoSchool",
    request: z.object({}).default({}),
    response: z.object({
      schoolId: z.string(),
      classId: z.string(),
      kidIds: z.array(z.string()),
    }),
  },

  /** Begin pairing a KT37: returns a code the watch APK submits back. */
  startWatchPairing: {
    name: "startWatchPairing",
    request: z.object({ kidId: z.string(), imei: Imei, simNumber: SaudiPhone.optional() }),
    response: z.object({ watchId: z.string(), pairingCode: z.string(), expiresAt: z.number() }),
  },

  /** Watch APK calls this with the pairing code to finish binding. */
  confirmWatchPairing: {
    name: "confirmWatchPairing",
    request: z.object({ imei: Imei, pairingCode: z.string() }),
    response: z.object({ watchId: z.string(), kidId: z.string(), deviceToken: z.string() }),
  },

  /** Bulk attendance from a watch scan; server validates against class roster. */
  submitAttendance: {
    name: "submitAttendance",
    request: z.object({
      schoolId: z.string(),
      classId: z.string(),
      date: z.string().date(),
      periodIndex: z.number().int().nonnegative().optional(),
      marks: z.array(
        z.object({
          kidId: z.string(),
          status: AttendanceStatus,
          watchId: z.string().optional(),
        }),
      ),
    }),
    response: z.object({ sessionId: z.string(), counts: z.record(z.string(), z.number()) }),
  },

  /** Raise an SOS on behalf of a watch (APK or SMS bridge). */
  raiseSos: {
    name: "raiseSos",
    request: z.object({ watchId: z.string(), lat: z.number(), lng: z.number() }),
    response: z.object({ alertId: z.string() }),
  },

  /** Look up a watch by its public Akbadna ID (for "add contact"). */
  resolveAkbadnaId: {
    name: "resolveAkbadnaId",
    request: z.object({ akbadnaId: AkbadnaId }),
    response: z
      .object({ kidId: z.string(), displayName: z.string(), schoolName: z.string().optional() })
      .nullable(),
  },

  /** Offer a carpool trip. */
  offerCarpoolTrip: {
    name: "offerCarpoolTrip",
    request: z.object({
      schoolId: z.string(),
      direction: TripDirection,
      seatsTotal: z.number().int().min(1).max(7),
      weekDays: z.array(z.number().int().min(0).max(6)),
      vehicle: z.object({ make: z.string(), colour: z.string(), plate: z.string() }),
    }),
    response: z.object({ tripId: z.string() }),
  },

  /** Send an SMS control command to a watch via the SMS bridge. */
  sendWatchCommand: {
    name: "sendWatchCommand",
    request: z.object({
      watchId: z.string(),
      command: z.enum([
        "requestPosition",
        "remoteMonitor",
        "powerOff",
        "syncTime",
        "setUploadInterval",
      ]),
      params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    }),
    response: z.object({ dispatched: z.boolean() }),
  },
} as const;

export type CallableName = keyof typeof callables;
export type CallableRequest<K extends CallableName> = z.infer<(typeof callables)[K]["request"]>;
export type CallableResponse<K extends CallableName> = z.infer<(typeof callables)[K]["response"]>;
