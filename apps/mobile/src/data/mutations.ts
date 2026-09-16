/**
 * Write operations. By default they run client-side against Firestore (free
 * plan). Set EXPO_PUBLIC_USE_FUNCTIONS=1 to route the same calls through the
 * deployed Cloud Functions instead — no screen changes needed.
 */
import { arrayUnion, collection, doc, setDoc } from "firebase/firestore";
import {
  canInvite,
  cueForAttendance,
  validateSchedule,
  paths,
  rewardCue,
  type AttendanceStatus,
  type CallableName,
  type CallableRequest,
  type CallableResponse,
  type RewardGlyph,
  type Role,
} from "@akbadna/core";
import { auth, db } from "@/lib/firebase";
import { call } from "@/lib/functions";
import { USE_FUNCTIONS } from "@/lib/config";
import * as client from "./ops.client";

async function run<K extends CallableName>(
  name: K,
  payload: CallableRequest<K>,
): Promise<CallableResponse<K>> {
  if (USE_FUNCTIONS) return call(name, payload);
  const fn = (client as Record<string, unknown>)[name] as
    ((p: CallableRequest<K>) => Promise<CallableResponse<K>>) | undefined;
  if (!fn) throw new Error(`العملية "${name}" تتطلب تفعيل الدوال`);
  return fn(payload);
}

export const createFamily = (kids: { name: string; gradeLabel?: string }[]) =>
  run("createFamily", { kids });

export const addKid = (input: CallableRequest<"addKid">) => run("addKid", input);

export const createSchoolWithClass = (input: CallableRequest<"createSchoolWithClass">) =>
  run("createSchoolWithClass", input);

export const joinByCode = (
  code: string,
  asRole: CallableRequest<"joinByCode">["asRole"],
  kidIds: string[] = [],
) => run("joinByCode", { code: code.toUpperCase(), asRole, kidIds });

export const sendMessage = (
  input: Omit<CallableRequest<"sendMessage">, "channel"> & {
    channel?: CallableRequest<"sendMessage">["channel"];
  },
) => run("sendMessage", { channel: "direct", ...input });

export const topUpWallet = (kidId: string, amountHalalas: number) =>
  run("topUpWallet", { kidId, amountHalalas });

export const submitAttendance = (input: CallableRequest<"submitAttendance">) =>
  run("submitAttendance", input);

export const offerCarpoolTrip = (input: CallableRequest<"offerCarpoolTrip">) =>
  run("offerCarpoolTrip", input);

export const resolveAkbadnaId = (akbadnaId: string) => run("resolveAkbadnaId", { akbadnaId });

export const seedDemoSchool = () => run("seedDemoSchool", {});

/** Add a resolved Akbadna ID as a contact of one of the caller's kids. */
export async function addContact(input: {
  ownerKidId: string;
  akbadnaId: string;
  displayName: string;
  relation?: string;
}) {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");
  const ref = doc(collection(db, paths.contacts()));
  await setDoc(ref, {
    id: ref.id,
    ownerKidId: input.ownerKidId,
    akbadnaId: input.akbadnaId,
    displayName: input.displayName,
    ...(input.relation ? { relation: input.relation } : {}),
    status: "accepted",
    createdBy: u,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

/* ── Carpool requests (client-only) ────────────────────────────────────── */

export async function requestCarpoolJoin(tripId: string, kidIds: string[], message?: string) {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");
  const ref = doc(collection(db, paths.carpoolRequests(tripId)));
  await setDoc(ref, {
    id: ref.id,
    tripId,
    requesterUid: u,
    kidIds,
    status: "pending",
    ...(message ? { message } : {}),
    createdBy: u,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function decideCarpoolRequest(
  tripId: string,
  requestId: string,
  accepted: boolean,
  uid: string,
) {
  await setDoc(
    doc(db, `${paths.carpoolRequests(tripId)}/${requestId}`),
    {
      status: accepted ? "accepted" : "rejected",
      decidedAt: Date.now(),
      decidedBy: uid,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/** Clear the caller's unread counter on a thread. */
export async function markThreadRead(threadId: string, uid: string) {
  await setDoc(doc(db, paths.thread(threadId)), { unread: { [uid]: 0 } }, { merge: true });
}

/** Raise an SOS for a kid. Client-side alert on the free plan. */
export async function raiseKidSos(
  kidId: string,
  loc: { lat: number; lng: number },
): Promise<{ alertId: string }> {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");
  const ref = doc(collection(db, paths.alerts()));
  await setDoc(ref, {
    id: ref.id,
    kind: "sos",
    severity: "critical",
    state: "open",
    kidId,
    location: loc,
    title: "طلب استغاثة",
    detail: "تم تفعيل زر الاستغاثة من التطبيق",
    raisedAt: Date.now(),
    notifiedUids: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return { alertId: ref.id };
}

/**
 * Queues the cue a mark should put on the child's watch.
 *
 * Fire-and-forget by design: the register is the teacher's record and must not
 * fail because a watch is unpaired or offline. Returns what happened so the row
 * can show it, and never throws at the caller.
 */
export async function queueAttendanceCue(input: {
  kidId: string;
  watchId?: string;
  status: AttendanceStatus;
}): Promise<"sent" | "no-watch" | "skipped" | "failed"> {
  const cue = cueForAttendance(input.status, Date.now());
  if (!cue) return "skipped"; // excused — nothing reaches the child
  if (!input.watchId) return "no-watch";
  try {
    const ref = doc(collection(db, paths.watchCommands(input.watchId)));
    await setDoc(ref, {
      id: ref.id,
      watchId: input.watchId,
      kidId: input.kidId,
      cue: cue.cue,
      text: cue.text,
      ...(cue.durationSec ? { durationSec: cue.durationSec } : {}),
      startedAt: cue.startedAt,
      expiresAt: cue.expiresAt,
      origin: "attendance",
      status: "queued",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return "sent";
  } catch {
    return "failed";
  }
}

/**
 * Awards a student a badge for standing out in the lesson. It sits on the watch
 * until the school day ends, then the device drops it on expiry.
 *
 * Same fire-and-forget contract as {@link queueAttendanceCue}: praise must never
 * be the thing that makes a screen throw.
 */
export async function sendReward(input: {
  kidId: string;
  watchId?: string;
  glyph: RewardGlyph;
  timeZone?: string;
}): Promise<"sent" | "no-watch" | "failed"> {
  if (!input.watchId) return "no-watch";
  const cue = rewardCue(input.glyph, Date.now(), input.timeZone);
  try {
    const ref = doc(collection(db, paths.watchCommands(input.watchId)));
    await setDoc(ref, {
      id: ref.id,
      watchId: input.watchId,
      kidId: input.kidId,
      cue: cue.cue,
      glyph: cue.glyph,
      text: cue.text,
      startedAt: cue.startedAt,
      expiresAt: cue.expiresAt,
      origin: "reward",
      status: "queued",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return "sent";
  } catch {
    return "failed";
  }
}

/* ── The chain of trust ──────────────────────────────────────────────────── */

const randomCode = () => {
  // No I, O, 0 or 1 — a code gets read aloud and typed by hand.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
};

/**
 * Mints an invitation. The code carries the standing it grants, and
 * {@link redemptionProblem} refuses to redeem it as anything else.
 *
 * A teacher may invite families and nothing more — letting one mint another
 * would close a loop and take the school out of control of its own staff.
 */
export async function createInviteCode(input: {
  schoolId: string;
  classId?: string;
  inviterRole: Role;
  grants: Role;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<string> {
  if (!canInvite(input.inviterRole, input.grants)) {
    throw new Error("ليست لديك صلاحية إصدار هذه الدعوة");
  }
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");

  const code = randomCode();
  await setDoc(doc(db, paths.joinCode(code)), {
    code,
    schoolId: input.schoolId,
    ...(input.classId ? { classId: input.classId } : {}),
    role: input.grants,
    createdByUid: u,
    uses: 0,
    ...(input.maxUses ? { maxUses: input.maxUses } : {}),
    ...(input.expiresInDays ? { expiresAt: Date.now() + input.expiresInDays * 86_400_000 } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return code;
}

/**
 * The teacher's decision on a child asking to join their class.
 *
 * Admitting is what actually puts the child on the roster — the join code only
 * ever created a request. Refusing leaves the record intact and merely closed,
 * so a family can see what happened instead of the child silently vanishing.
 */
export async function decideEnrolment(input: {
  kidId: string;
  schoolId: string;
  classId: string;
  admit: boolean;
}): Promise<void> {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");

  await setDoc(
    doc(db, paths.kid(input.kidId)),
    {
      enrolmentStatus: input.admit ? "active" : "rejected",
      enrolmentDecidedBy: u,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (input.admit) {
    await setDoc(
      doc(db, paths.class(input.schoolId, input.classId)),
      { studentIds: arrayUnion(input.kidId), updatedAt: Date.now() },
      { merge: true },
    );
  }
}

/** Marks a school as vouched for. Only the operator's own account may do this. */
export async function verifySchool(schoolId: string): Promise<void> {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");
  await setDoc(
    doc(db, paths.school(schoolId)),
    { status: "verified", verifiedAt: Date.now(), verifiedBy: u, updatedAt: Date.now() },
    { merge: true },
  );
}

/**
 * Writes the class timetable, applied to every school day.
 *
 * Firestore keys the schedule by weekday so a school can run different days
 * differently; almost none do, so the editor writes one day to all of them and
 * the shape stays open for the exception.
 */
export async function saveSchedule(input: {
  schoolId: string;
  classId: string;
  periods: { name: string; start: string; end: string }[];
  weekDays: number[];
}): Promise<void> {
  const problems = validateSchedule(input.periods);
  if (problems.length) throw new Error("الجدول يحتوي على أخطاء");

  const day = input.periods
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((p, index) => ({
      index,
      name: p.name.trim(),
      start: p.start,
      end: p.end,
      kind: /استراحة/.test(p.name)
        ? "break"
        : /طابور/.test(p.name)
          ? "assembly"
          : /انصراف/.test(p.name)
            ? "dismissal"
            : "lesson",
    }));

  const schedule: Record<string, typeof day> = {};
  for (const d of input.weekDays) schedule[String(d)] = day;

  await setDoc(
    doc(db, paths.class(input.schoolId, input.classId)),
    { schedule, updatedAt: Date.now() },
    { merge: true },
  );
}
