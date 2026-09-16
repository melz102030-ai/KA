import { z } from "zod";
import { Audit, EpochMillis, NationalId, SaudiPhone } from "../common.js";
import { Locale, Role } from "../enums.js";
import { MembershipStatus } from "../trust.js";

/**
 * users/{uid} — one per Firebase Auth account.
 * `roles` is the set the account may act as; `activeRole` is the current UI mode.
 */
export const UserProfile = Audit.extend({
  uid: z.string().min(1),
  displayName: z.string().min(1).max(80),
  phone: SaudiPhone.optional(),
  email: z.string().email().optional(),
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
  /**
   * The join code this membership was redeemed with. Staff rows must carry one:
   * the security rules read the code back and refuse a teacher row that no live
   * code granted.
   */
  viaCode: z.string().optional(),
  /** Standing with the school. Only "active" grants anything. */
  status: MembershipStatus.default("active"),
  acceptedAt: EpochMillis.optional(),
});
export type Membership = z.infer<typeof Membership>;

/**
 * config/operators — the accounts that may verify a school.
 *
 * Deliberately a document nobody can write from the app: the security rules
 * refuse every write to it, so it is created and edited only from the Firebase
 * console by whoever owns the project. An operator list the app could edit
 * would be an operator list an attacker could join.
 */
export const OperatorsDoc = z.object({
  uids: z.array(z.string()).default([]),
});
export type OperatorsDoc = z.infer<typeof OperatorsDoc>;
