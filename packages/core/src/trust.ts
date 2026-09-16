import { z } from "zod";
import type { Role } from "./enums.js";

/**
 * The chain of trust, and who is allowed to vouch for whom.
 *
 * Without a Ministry connection nobody outside the app can confirm that a
 * school is real, that a person teaches there, or that a child is in that
 * class. So the app carries its own chain, and every link is granted by the
 * link above it:
 *
 *   the operator verifies the school
 *     the school's admin invites its teachers
 *       the teacher admits children to their class
 *         the parent brings the child
 *
 * A link nobody granted is worth nothing, which is why every status below
 * starts at its weakest value and has to be moved deliberately. Self-claimed
 * standing — "I say I am a teacher" — is exactly what this module refuses.
 */

/** How far a school has been vouched for. */
export const SchoolStatus = z.enum(["pending", "verified", "suspended"]);
export type SchoolStatus = z.infer<typeof SchoolStatus>;

/** Where a person stands with a school. */
export const MembershipStatus = z.enum(["invited", "active", "rejected", "removed"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

/** Where a child stands with a class. */
export const EnrolmentStatus = z.enum([
  "pending",
  "active",
  "rejected",
  "transferred",
  "graduated",
]);
export type EnrolmentStatus = z.infer<typeof EnrolmentStatus>;

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  pending: "بانتظار التوثيق",
  verified: "موثّقة",
  suspended: "موقوفة",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  invited: "بانتظار القبول",
  active: "معتمَد",
  rejected: "مرفوض",
  removed: "مُزال",
};

export const ENROLMENT_STATUS_LABELS: Record<EnrolmentStatus, string> = {
  pending: "بانتظار اعتماد المعلم",
  active: "مقيَّد في الفصل",
  rejected: "مرفوض",
  transferred: "منقول",
  graduated: "متخرّج",
};

/* ── Who may vouch for whom ──────────────────────────────────────────────── */

/**
 * Whether `inviter` may mint an invitation granting `invitee`.
 *
 * A teacher may bring in the families of their own class, and nothing else —
 * in particular a teacher cannot mint another teacher, or the chain would have
 * a loop and the school would lose control of its own staff.
 */
export function canInvite(inviter: Role, invitee: Role): boolean {
  if (inviter === "school_admin") return invitee === "teacher" || invitee === "parent";
  if (inviter === "teacher") return invitee === "parent";
  return false;
}

/** Only the school side admits a child to a class. A parent asks; they decide. */
export function canApproveEnrolment(role: Role): boolean {
  return role === "teacher" || role === "school_admin";
}

/** Only the operator moves a school out of "pending". */
export function canVerifySchool(role: Role): boolean {
  return role === "school_admin";
}

/* ── Redeeming an invitation ─────────────────────────────────────────────── */

export type RedemptionProblem = "expired" | "exhausted" | "role-mismatch" | "school-suspended";

export const REDEMPTION_MESSAGES: Record<RedemptionProblem, string> = {
  expired: "انتهت صلاحية الرمز",
  exhausted: "استُهلك هذا الرمز بالكامل",
  "role-mismatch": "هذا الرمز لا يمنح هذه الصفة",
  "school-suspended": "المدرسة موقوفة حاليًا",
};

export type Redemption = {
  /** The standing the code actually grants. */
  codeRole: Role;
  /** The standing the person is claiming when redeeming it. */
  asRole: Role;
  expiresAt?: number;
  uses: number;
  maxUses?: number;
  schoolStatus?: SchoolStatus;
  now: number;
};

/**
 * Why a code cannot be redeemed, or null if it can.
 *
 * The role check is the one that matters. A caller that takes the redeemer's
 * word for which standing they are claiming, and ignores what the code grants,
 * hands anyone holding a parent code a teacher's access — the code says what it
 * grants, the person redeeming it does not.
 */
export function redemptionProblem(r: Redemption): RedemptionProblem | null {
  if (r.codeRole !== r.asRole) return "role-mismatch";
  if (r.expiresAt !== undefined && r.now > r.expiresAt) return "expired";
  if (r.maxUses !== undefined && r.uses >= r.maxUses) return "exhausted";
  if (r.schoolStatus === "suspended") return "school-suspended";
  return null;
}

/* ── What a status permits ───────────────────────────────────────────────── */

/**
 * A school still awaiting verification may run day to day — a real class should
 * not wait on paperwork to take the register — but it cannot grow: it may not
 * take on new families or staff until someone has vouched for it. A suspended
 * school does nothing at all.
 */
export function schoolCapabilities(status: SchoolStatus): {
  canOperate: boolean;
  canRecruit: boolean;
  notice: string | null;
} {
  switch (status) {
    case "verified":
      return { canOperate: true, canRecruit: true, notice: null };
    case "pending":
      return {
        canOperate: true,
        canRecruit: false,
        notice: "المدرسة بانتظار التوثيق — لا يمكن دعوة معلمين أو أولياء أمور جدد حتى تُوثَّق.",
      };
    case "suspended":
      return {
        canOperate: false,
        canRecruit: false,
        notice: "المدرسة موقوفة. راجع مشغّل النظام.",
      };
  }
}

/** Whether this membership currently grants anything at all. */
export const membershipIsActive = (s: MembershipStatus): boolean => s === "active";

/** Whether this child counts as being in the class right now. */
export const enrolmentIsActive = (s: EnrolmentStatus): boolean => s === "active";

/**
 * A child who has left a class — moved school, finished, or was refused —
 * should stop appearing in it without their record being destroyed. These are
 * the states that mean "gone, but on file".
 */
export const enrolmentIsClosed = (s: EnrolmentStatus): boolean =>
  s === "transferred" || s === "graduated" || s === "rejected";
