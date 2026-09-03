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

export const seedDemoSchool = () => run("seedDemoSchool", {});

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
