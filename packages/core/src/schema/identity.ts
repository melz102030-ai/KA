import { z } from "zod";
import { Audit, EpochMillis, NationalId, SaudiPhone } from "../common.js";
import { Locale, Role } from "../enums.js";

/**
 * users/{uid} — one per Firebase Auth account.
 * `roles` is the set the account may act as; `activeRole` is the current UI mode.
 */
export const UserProfile = Audit.extend({
  uid: z.string().min(1),
  displayName: z.string().min(1).max(80),
  phone: SaudiPhone.optional(),
  email: z.string().email().optional(),
  photoEmoji: z.string().emoji().optional(),
  roles: z.array(Role).min(1),
  activeRole: Role,
  locale: Locale.default("ar"),
  /** Set once Nafath verification lands. */
  nationalId: NationalId.optional(),
  nafathVerifiedAt: EpochMillis.optional(),
  /** Device-local quick unlock is NOT stored here — it stays on the device. */
  fcmTokens: z.array(z.string()).default([]),
  disabled: z.boolean().default(false),
});
export type UserProfile = z.infer<typeof UserProfile>;

/**
 * memberships/{id} — links a user to a school with a role and scope.
 * A parent is scoped to their kids; a teacher to their classes.
 */
export const Membership = Audit.extend({
  id: z.string().min(1),
  uid: z.string().min(1),
  schoolId: z.string().min(1),
  role: Role,
  kidIds: z.array(z.string()).default([]),
  classIds: z.array(z.string()).default([]),
  invitedBy: z.string().optional(),
  acceptedAt: EpochMillis.optional(),
});
export type Membership = z.infer<typeof Membership>;
