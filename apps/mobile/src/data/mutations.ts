import { doc, setDoc } from "firebase/firestore";
import { paths, type Role } from "@akbadna/core";
import { db } from "@/lib/firebase";
import { call } from "@/lib/functions";

export const createFamily = (kids: { name: string; gradeLabel?: string }[]) =>
  call("createFamily", { kids });

export const addKid = (input: {
  name: string;
  gradeLabel?: string;
  schoolId?: string;
  classId?: string;
}) => call("addKid", input);

export const createSchoolWithClass = (input: {
  schoolName: string;
  className: string;
  grade: string;
}) => call("createSchoolWithClass", input);

export const joinByCode = (code: string, asRole: Role, kidIds: string[] = []) =>
  call("joinByCode", { code: code.toUpperCase(), asRole, kidIds });

export const sendMessage = (input: {
  threadId?: string;
  to?: string[];
  channel?: "school" | "teacher" | "carpool" | "direct";
  subjectRef?: { kind: "kid" | "class" | "trip" | "school"; id: string };
  text: string;
}) => call("sendMessage", { channel: "direct", ...input });

export const topUpWallet = (kidId: string, amountHalalas: number) =>
  call("topUpWallet", { kidId, amountHalalas });

export const submitAttendance = (input: {
  schoolId: string;
  classId: string;
  date: string;
  periodIndex?: number;
  marks: { kidId: string; status: "present" | "late" | "absent" | "excused"; watchId?: string }[];
}) => call("submitAttendance", input);

/** Clear the caller's unread counter on a thread (rules allow self-update). */
export async function markThreadRead(threadId: string, uid: string) {
  await setDoc(doc(db, paths.thread(threadId)), { unread: { [uid]: 0 } }, { merge: true });
}
