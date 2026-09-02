import { z } from "zod";
import { Audit, EpochMillis, GeoPoint } from "../common.js";
import { RequestStatus, TripDirection, TripStatus } from "../enums.js";

/** carpoolTrips/{tripId} — a recurring or one-off ride offered by a driver-parent. */
export const CarpoolTrip = Audit.extend({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  driverUid: z.string().min(1),
  direction: TripDirection,
  status: TripStatus.default("offered"),
  seatsTotal: z.number().int().min(1).max(7),
  seatsTaken: z.number().int().nonnegative().default(0),
  vehicle: z.object({
    make: z.string(),
    colour: z.string(),
    plate: z.string(),
  }),
  /** Days this trip runs, 0..6. Empty = one-off on `date`. */
  weekDays: z.array(z.number().int().min(0).max(6)).default([]),
  date: z.string().date().optional(),
  departTime: z.string().optional(),
  origin: GeoPoint.optional(),
  riders: z
    .array(z.object({ kidId: z.string(), guardianUid: z.string(), pickup: GeoPoint.optional() }))
    .default([]),
  /** Live tracking, only while status === "active". */
  live: z
    .object({
      location: GeoPoint,
      etaMinutes: z.number().nonnegative(),
      updatedAt: EpochMillis,
    })
    .optional(),
});
export type CarpoolTrip = z.infer<typeof CarpoolTrip>;

/** carpoolTrips/{tripId}/requests/{requestId} — a parent asking to join. */
export const CarpoolRequest = Audit.extend({
  id: z.string().min(1),
  tripId: z.string().min(1),
  requesterUid: z.string().min(1),
  kidIds: z.array(z.string()).min(1),
  status: RequestStatus.default("pending"),
  message: z.string().max(500).optional(),
  decidedAt: EpochMillis.optional(),
  decidedBy: z.string().optional(),
  threadId: z.string().optional(),
});
export type CarpoolRequest = z.infer<typeof CarpoolRequest>;
