/**
 * Write operations. By default they run client-side against Firestore (free
 * plan). Set EXPO_PUBLIC_USE_FUNCTIONS=1 to route the same calls through the
 * deployed Cloud Functions instead — no screen changes needed.
 */
import { collection, doc, setDoc } from "firebase/firestore";
import {
  type CallableName,
  type CallableRequest,
  type CallableResponse,
  paths,
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
