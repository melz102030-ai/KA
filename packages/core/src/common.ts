import { z } from "zod";

/**
 * Timestamps are stored as Firestore Timestamps at rest. Across the wire and in
 * app code we normalise to epoch milliseconds so the model stays transport-agnostic.
 */
export const EpochMillis = z.number().int().nonnegative();
export type EpochMillis = z.infer<typeof EpochMillis>;

/** Standard audit fields present on every top-level document. */
export const Audit = z.object({
  createdAt: EpochMillis,
  updatedAt: EpochMillis,
  createdBy: z.string().min(1).optional(),
});
export type Audit = z.infer<typeof Audit>;

/** WGS84 point plus horizontal accuracy in metres. */
export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

/** Saudi mobile number in E.164 (+9665XXXXXXXX). */
export const SaudiPhone = z
  .string()
  .regex(/^\+9665\d{8}$/, "expected E.164 Saudi mobile, e.g. +9665XXXXXXXX");
export type SaudiPhone = z.infer<typeof SaudiPhone>;

/** Saudi national / iqama id: 10 digits starting 1 or 2. Kept opt-in for later Nafath. */
export const NationalId = z.string().regex(/^[12]\d{9}$/);
export type NationalId = z.infer<typeof NationalId>;

/** 15-digit GSM IMEI (Luhn not enforced here). */
export const Imei = z.string().regex(/^\d{15}$/);
export type Imei = z.infer<typeof Imei>;

/**
 * Public sharing handle for a watch — "AKB-XXXX-XXXX" (Crockford-ish, no I/O/1/0).
 * Lets people connect without exchanging phone numbers.
 */
export const AkbadnaId = z.string().regex(/^AKB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
export type AkbadnaId = z.infer<typeof AkbadnaId>;

const AKB_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Generate a fresh Akbadna ID. `rand` defaults to Math.random for testability. */
export function generateAkbadnaId(rand: () => number = Math.random): AkbadnaId {
  const block = () =>
    Array.from({ length: 4 }, () => AKB_ALPHABET[Math.floor(rand() * AKB_ALPHABET.length)]).join(
      "",
    );
  return `AKB-${block()}-${block()}` as AkbadnaId;
}

/** Money is integer minor units (halalas) with an explicit currency. */
export const Money = z.object({
  amount: z.number().int(),
  currency: z.literal("SAR").default("SAR"),
});
export type Money = z.infer<typeof Money>;

/** "HH:MM" 24h wall-clock, used for schedules. */
export const ClockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export type ClockTime = z.infer<typeof ClockTime>;

/** ISO week day, 0 = Sunday (matches the Saudi school week). */
export const WeekDay = z.number().int().min(0).max(6);
export type WeekDay = z.infer<typeof WeekDay>;
