import { z } from "zod";
import type { Role } from "./enums.js";
import { isValidNationalId } from "./identity.js";

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

/**
 * How far a school has been vouched for.
 *
 * Five states, not two, because "not verified yet" covers two very different
 * situations and the school deserves to know which one it is in: it has not
 * sent its papers, or it has sent them and is waiting on the operator. A
 * rejected school is told why and may fix and resend.
 */
export const SchoolStatus = z.enum(["pending", "submitted", "verified", "rejected", "suspended"]);
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
  pending: "لم تُرسل بيانات التوثيق",
  submitted: "بانتظار مراجعة المشغّل",
  verified: "موثّقة",
  rejected: "أُعيدت للتصحيح",
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

/*
 * There was a canVerifySchool(role) here that answered "school_admin" — it said
 * a school's own head may stamp their school as verified, which is no check at
 * all. Standing is not a property of a role, so it is decided by
 * canSetSchoolStatus below, which asks who you are relative to this school.
 */

/* ── Redeeming an invitation ─────────────────────────────────────────────── */

export type RedemptionProblem = "expired" | "exhausted" | "role-mismatch" | "school-inactive";

export const REDEMPTION_MESSAGES: Record<RedemptionProblem, string> = {
  expired: "انتهت صلاحية الرمز",
  exhausted: "استُهلك هذا الرمز بالكامل",
  "role-mismatch": "هذا الرمز لا يمنح هذه الصفة",
  "school-inactive": "المدرسة غير مفعّلة — لم تُوثَّق بعد أو أُوقفت",
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
  // Any school that may not operate may not take people in either — an
  // invitation to a school that is not running leads nowhere.
  if (r.schoolStatus !== undefined && !schoolCapabilities(r.schoolStatus).canOperate) {
    return "school-inactive";
  }
  return null;
}

/* ── What a status permits ───────────────────────────────────────────────── */

/**
 * What a school may do at each stage.
 *
 * Nothing runs before verification. That is a deliberate choice and a costly
 * one — a real school waits on the operator before it can take a register —
 * but the alternative is an app where anyone can raise a school, gather other
 * people's children into it and start collecting their locations. The wait is
 * paid by the school; the risk would have been paid by the children.
 *
 * What makes the wait bearable is that it is short and visible: the school
 * sends its papers, sees exactly where its request stands, and one tap from
 * the operator opens everything.
 */
export function schoolCapabilities(status: SchoolStatus): {
  canOperate: boolean;
  canRecruit: boolean;
  /** Whether the school should be shown the evidence form. */
  canSubmit: boolean;
  notice: string | null;
} {
  switch (status) {
    case "verified":
      return { canOperate: true, canRecruit: true, canSubmit: false, notice: null };
    case "pending":
      return {
        canOperate: false,
        canRecruit: false,
        canSubmit: true,
        notice: "المدرسة لا تعمل قبل توثيقها — أرسل بيانات التوثيق لتبدأ المراجعة.",
      };
    case "submitted":
      return {
        canOperate: false,
        canRecruit: false,
        canSubmit: false,
        notice: "وصلت البيانات ويجري التحقّق منها. ستعمل المدرسة فور اعتمادها.",
      };
    case "rejected":
      return {
        canOperate: false,
        canRecruit: false,
        canSubmit: true,
        notice: "أُعيد الطلب للتصحيح. راجع سبب الإعادة وأعد الإرسال.",
      };
    case "suspended":
      return {
        canOperate: false,
        canRecruit: false,
        canSubmit: false,
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

/* ── Verifying a school ──────────────────────────────────────────────────── */

/**
 * What a school sends to be verified.
 *
 * None of this touches the Ministry. The licence number is recorded as a plain
 * number the operator can check against a public register by hand — and, more
 * usefully, as something no two schools may share. The point of the set is
 * that each item is checkable by a person in a few minutes: ring the published
 * landline, read the licence, see that the location is a school and not a flat.
 */
export type SchoolEvidence = {
  /** The school's own name, as registered. */
  name?: string;
  /** Licence / school number as printed on its papers. */
  licenceNo?: string;
  headTeacherName?: string;
  /** Verified by checksum here; identity is confirmed by the phone call. */
  headTeacherNationalId?: string;
  /** The school's published number — landline or mobile, E.164. */
  phone?: string;
  location?: { lat: number; lng: number };
};

export type EvidenceProblem =
  | "no-name"
  | "no-licence"
  | "bad-licence"
  | "no-head-teacher"
  | "bad-head-id"
  | "no-phone"
  | "bad-phone"
  | "no-location";

export const EVIDENCE_MESSAGES: Record<EvidenceProblem, string> = {
  "no-name": "اسم المدرسة مطلوب",
  "no-licence": "رقم المدرسة أو رخصتها مطلوب",
  "bad-licence": "رقم المدرسة يجب أن يكون من ٣ إلى ٢٠ خانة بلا رموز",
  "no-head-teacher": "اسم مدير المدرسة مطلوب",
  "bad-head-id": "رقم هوية مدير المدرسة غير صحيح",
  "no-phone": "هاتف المدرسة المعلن مطلوب",
  "bad-phone": "الهاتف يجب أن يكون سعوديًا بصيغة +9661XXXXXXX أو +9665XXXXXXXX",
  "no-location": "موقع المدرسة مطلوب — التقطه وأنت داخلها",
};

/** Saudi landline (+9661…) or mobile (+9665…), both nine digits after 966. */
const SAUDI_PHONE = /^\+966[15]\d{8}$/;

/**
 * Every problem at once, so the school fixes the form in one pass rather than
 * being sent back six times.
 */
export function evidenceProblems(e: SchoolEvidence): EvidenceProblem[] {
  const out: EvidenceProblem[] = [];

  if (!e.name || e.name.trim().length < 3) out.push("no-name");

  const licence = e.licenceNo?.trim() ?? "";
  if (!licence) out.push("no-licence");
  else if (!/^\d{3,20}$/.test(licence)) out.push("bad-licence");

  if (!e.headTeacherName || e.headTeacherName.trim().length < 5) out.push("no-head-teacher");

  const id = e.headTeacherNationalId?.trim() ?? "";
  if (!id || !isValidNationalId(id)) out.push("bad-head-id");

  const phone = e.phone?.trim() ?? "";
  if (!phone) out.push("no-phone");
  else if (!SAUDI_PHONE.test(phone)) out.push("bad-phone");

  if (!e.location || typeof e.location.lat !== "number" || typeof e.location.lng !== "number") {
    out.push("no-location");
  }

  return out;
}

export const evidenceIsComplete = (e: SchoolEvidence): boolean => evidenceProblems(e).length === 0;

/**
 * Which statuses a school may move between, and who may move it.
 *
 * The school moves its own request forward only into review; the two states
 * that grant anything — verified, suspended — are the operator's alone. This
 * is the rule the whole chain rests on, so it is written once here and
 * mirrored in the security rules rather than trusted to the screens.
 */
export function canSetSchoolStatus(input: {
  from: SchoolStatus;
  to: SchoolStatus;
  isOperator: boolean;
  isSchoolAdmin: boolean;
  evidenceComplete?: boolean;
}): boolean {
  if (input.isOperator) {
    // The operator answers a request, or withdraws standing already given.
    return input.to !== input.from;
  }
  if (!input.isSchoolAdmin) return false;
  // A school may only hand itself in for review, and only with a full file.
  return (
    input.to === "submitted" &&
    (input.from === "pending" || input.from === "rejected") &&
    input.evidenceComplete === true
  );
}
