/**
 * Client-side implementations of the write operations — Firestore batches and
 * transactions run straight from the app, guarded by security rules. This is
 * what runs on the Firebase free plan (no Cloud Functions). Return shapes match
 * the callable contracts in @akbadna/core so the dispatcher stays type-safe.
 */
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import {
  type CallableRequest,
  type CallableResponse,
  generateAkbadnaId,
  generateJoinCode,
  paths,
} from "@akbadna/core";
import { auth, db } from "@/lib/firebase";

function uid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("sign-in required");
  return u;
}
const ts = () => Date.now();
const membershipId = (u: string, schoolId: string, role: string) => `${u}_${schoolId}_${role}`;

export async function createFamily(
  input: CallableRequest<"createFamily">,
): Promise<CallableResponse<"createFamily">> {
  const u = uid();
  const batch = writeBatch(db);
  const kidIds: string[] = [];
  for (const k of input.kids) {
    const ref = doc(collection(db, paths.kids()));
    kidIds.push(ref.id);
    batch.set(ref, {
      id: ref.id,
      name: k.name,
      ...(k.gradeLabel ? { gradeLabel: k.gradeLabel } : {}),
      guardianUids: [u],
      akbadnaId: generateAkbadnaId(),
      live: { presence: "unknown", watchOnline: false },
      createdBy: u,
      createdAt: ts(),
      updatedAt: ts(),
    });
  }
  batch.set(
    doc(db, paths.user(u)),
    { roles: arrayUnion("parent"), onboardedAt: ts(), updatedAt: ts() },
    { merge: true },
  );
  await batch.commit();
  return { kidIds };
}

export async function addKid(
  input: CallableRequest<"addKid">,
): Promise<CallableResponse<"addKid">> {
  const u = uid();
  const ref = doc(collection(db, paths.kids()));
  const akbadnaId = generateAkbadnaId();
  const batch = writeBatch(db);
  batch.set(ref, {
    id: ref.id,
    name: input.name,
    ...(input.gradeLabel ? { gradeLabel: input.gradeLabel } : {}),
    ...(input.schoolId ? { schoolId: input.schoolId } : {}),
    ...(input.classId ? { classId: input.classId } : {}),
    guardianUids: [u],
    akbadnaId,
    live: { presence: "unknown", watchOnline: false },
    createdBy: u,
    createdAt: ts(),
    updatedAt: ts(),
  });
  if (input.schoolId && input.classId) {
    batch.set(
      doc(db, paths.class(input.schoolId, input.classId)),
      { studentIds: arrayUnion(ref.id), updatedAt: ts() },
      { merge: true },
    );
  }
  await batch.commit();
  return { kidId: ref.id, akbadnaId };
}

export async function createSchoolWithClass(
  input: CallableRequest<"createSchoolWithClass">,
): Promise<CallableResponse<"createSchoolWithClass">> {
  const u = uid();
  const schoolRef = doc(collection(db, paths.schools()));
  const classRef = doc(collection(db, paths.classes(schoolRef.id)));
  const code = generateJoinCode();
  const batch = writeBatch(db);

  batch.set(schoolRef, {
    id: schoolRef.id,
    name: input.schoolName,
    campusRadiusM: 150,
    timezone: "Asia/Riyadh",
    weekDays: [0, 1, 2, 3, 4],
    adminUids: [u],
    createdBy: u,
    createdAt: ts(),
    updatedAt: ts(),
  });
  batch.set(classRef, {
    id: classRef.id,
    schoolId: schoolRef.id,
    name: input.className,
    grade: input.grade,
    homeroomTeacherId: u,
    teacherIds: [u],
    studentIds: [],
    schedule: {},
    createdBy: u,
    createdAt: ts(),
    updatedAt: ts(),
  });
  batch.set(doc(db, paths.joinCode(code)), {
    code,
    schoolId: schoolRef.id,
    classId: classRef.id,
    role: "parent",
    createdByUid: u,
    uses: 0,
    createdAt: ts(),
    updatedAt: ts(),
  });
  for (const role of ["teacher", "school_admin"] as const) {
    const id = membershipId(u, schoolRef.id, role);
    batch.set(doc(db, paths.membership(id)), {
      id,
      uid: u,
      schoolId: schoolRef.id,
      role,
      classIds: role === "teacher" ? [classRef.id] : [],
      kidIds: [],
      acceptedAt: ts(),
      createdAt: ts(),
      updatedAt: ts(),
    });
  }
  batch.set(
    doc(db, paths.user(u)),
    { roles: arrayUnion("teacher", "school_admin"), onboardedAt: ts(), updatedAt: ts() },
    { merge: true },
  );
  await batch.commit();
  return { schoolId: schoolRef.id, classId: classRef.id, joinCode: code };
}

export async function joinByCode(
  input: CallableRequest<"joinByCode">,
): Promise<CallableResponse<"joinByCode">> {
  const u = uid();
  const code = input.code.toUpperCase();
  const codeSnap = await getDoc(doc(db, paths.joinCode(code)));
  if (!codeSnap.exists()) throw new Error("رمز غير صحيح");
  const c = codeSnap.data() as { schoolId: string; classId?: string; expiresAt?: number };
  if (c.expiresAt && Date.now() > c.expiresAt) throw new Error("انتهت صلاحية الرمز");

  const role = input.asRole === "teacher" ? "teacher" : "parent";
  const id = membershipId(u, c.schoolId, role);
  const batch = writeBatch(db);
  batch.set(doc(db, paths.membership(id)), {
    id,
    uid: u,
    schoolId: c.schoolId,
    role,
    classIds: c.classId ? [c.classId] : [],
    kidIds: input.kidIds,
    acceptedAt: ts(),
    createdAt: ts(),
    updatedAt: ts(),
  });
  if (c.classId && input.kidIds.length) {
    batch.set(
      doc(db, paths.class(c.schoolId, c.classId)),
      { studentIds: arrayUnion(...input.kidIds), updatedAt: ts() },
      { merge: true },
    );
    for (const kidId of input.kidIds) {
      batch.set(
        doc(db, paths.kid(kidId)),
        { schoolId: c.schoolId, classId: c.classId, updatedAt: ts() },
        { merge: true },
      );
    }
  }
  batch.set(codeSnap.ref, { uses: increment(1) }, { merge: true });
  batch.set(doc(db, paths.user(u)), { roles: arrayUnion(role), updatedAt: ts() }, { merge: true });
  await batch.commit();
  return { schoolId: c.schoolId, classId: c.classId };
}

export async function sendMessage(
  input: CallableRequest<"sendMessage">,
): Promise<CallableResponse<"sendMessage">> {
  const u = uid();
  const me = await getDoc(doc(db, paths.user(u)));
  const senderName: string = me.get("displayName") ?? "مستخدم";

  const batch = writeBatch(db);
  let threadId = input.threadId;
  let participants: string[] = [];

  if (!threadId) {
    participants = Array.from(new Set([u, ...(input.to ?? [])]));
    if (participants.length < 2) throw new Error("لا يوجد مستقبِل");
    const tRef = doc(collection(db, paths.threads()));
    threadId = tRef.id;
    batch.set(tRef, {
      id: threadId,
      channel: input.channel,
      participantUids: participants,
      ...(input.subjectRef ? { subjectRef: input.subjectRef } : {}),
      unread: Object.fromEntries(participants.filter((p) => p !== u).map((p) => [p, 0])),
      createdBy: u,
      createdAt: ts(),
      updatedAt: ts(),
    });
  } else {
    const t = await getDoc(doc(db, paths.thread(threadId)));
    if (!t.exists()) throw new Error("المحادثة غير موجودة");
    participants = (t.get("participantUids") as string[]) ?? [];
  }

  const mRef = doc(collection(db, paths.messages(threadId)));
  batch.set(mRef, {
    id: mRef.id,
    threadId,
    senderUid: u,
    senderName,
    text: input.text,
    at: ts(),
    system: false,
    attachments: [],
    readBy: [u],
  });

  const unreadInc: Record<string, unknown> = {};
  for (const p of participants.filter((x) => x !== u)) unreadInc[`unread.${p}`] = increment(1);
  batch.set(
    doc(db, paths.thread(threadId)),
    { lastMessage: { text: input.text, senderUid: u, at: ts() }, updatedAt: ts(), ...unreadInc },
    { merge: true },
  );

  await batch.commit();
  return { threadId, messageId: mRef.id };
}

export async function topUpWallet(
  input: CallableRequest<"topUpWallet">,
): Promise<CallableResponse<"topUpWallet">> {
  const u = uid();
  const acctRef = doc(db, paths.walletAccount(input.kidId));
  const balanceHalalas = await runTransaction(db, async (tx) => {
    const acct = await tx.get(acctRef);
    const prev = (acct.data()?.balance?.amount as number | undefined) ?? 0;
    const next = prev + input.amountHalalas;
    tx.set(
      acctRef,
      {
        kidId: input.kidId,
        ownerUid: u,
        balance: { amount: next, currency: "SAR" },
        frozen: false,
        updatedAt: ts(),
        createdAt: acct.exists() ? acct.get("createdAt") : ts(),
      },
      { merge: true },
    );
    const txRef = doc(collection(db, paths.walletTransactions(input.kidId)));
    tx.set(txRef, {
      id: txRef.id,
      kidId: input.kidId,
      kind: "topup",
      amount: { amount: input.amountHalalas, currency: "SAR" },
      balanceAfter: { amount: next, currency: "SAR" },
      label: "شحن رصيد",
      at: ts(),
      createdBy: u,
    });
    return next;
  });
  return { balanceHalalas };
}

export async function submitAttendance(
  input: CallableRequest<"submitAttendance">,
): Promise<CallableResponse<"submitAttendance">> {
  const u = uid();
  const classSnap = await getDoc(doc(db, paths.class(input.schoolId, input.classId)));
  if (!classSnap.exists()) throw new Error("الفصل غير موجود");
  const roster: string[] = classSnap.get("studentIds") ?? [];
  const rosterSet = new Set(roster);

  const sessionId = `${input.classId}_${input.date}${
    input.periodIndex != null ? `_p${input.periodIndex}` : ""
  }`;
  const counts: Record<string, number> = { present: 0, late: 0, absent: 0, excused: 0 };
  const batch = writeBatch(db);
  const marked = new Set<string>();

  for (const mark of input.marks) {
    if (!rosterSet.has(mark.kidId)) continue;
    marked.add(mark.kidId);
    counts[mark.status] = (counts[mark.status] ?? 0) + 1;
    batch.set(doc(db, `${paths.attendanceRecords(input.schoolId, sessionId)}/${mark.kidId}`), {
      sessionId,
      kidId: mark.kidId,
      classId: input.classId,
      status: mark.status,
      method: mark.watchId ? "watch_scan" : "manual",
      markedBy: u,
      markedAt: ts(),
      ...(mark.watchId ? { watchId: mark.watchId } : {}),
    });
  }
  for (const kidId of roster) {
    if (marked.has(kidId)) continue;
    counts.absent = (counts.absent ?? 0) + 1;
    batch.set(doc(db, `${paths.attendanceRecords(input.schoolId, sessionId)}/${kidId}`), {
      sessionId,
      kidId,
      classId: input.classId,
      status: "absent",
      method: "manual",
      markedBy: u,
      markedAt: ts(),
    });
  }
  batch.set(
    doc(db, paths.attendanceSession(input.schoolId, sessionId)),
    {
      id: sessionId,
      schoolId: input.schoolId,
      classId: input.classId,
      date: input.date,
      ...(input.periodIndex != null ? { periodIndex: input.periodIndex } : {}),
      takenBy: u,
      finalizedAt: ts(),
      counts,
      createdAt: ts(),
      updatedAt: ts(),
    },
    { merge: true },
  );
  await batch.commit();
  return { sessionId, counts };
}

export async function seedDemoSchool(): Promise<CallableResponse<"seedDemoSchool">> {
  const u = uid();
  const school = await createSchoolWithClass({
    schoolName: "مدرسة أكبادنا التجريبية",
    className: "أول متوسط - أ",
    grade: "أول متوسط",
  });
  const { kidIds } = await createFamily({
    kids: [
      { name: "أحمد محمد الغامدي", gradeLabel: "أول متوسط - أ" },
      { name: "منى محمد الغامدي", gradeLabel: "ثاني ابتدائي - ب" },
    ],
  });
  const batch = writeBatch(db);
  batch.set(
    doc(db, paths.class(school.schoolId, school.classId)),
    { studentIds: arrayUnion(...kidIds), updatedAt: ts() },
    { merge: true },
  );
  for (const kidId of kidIds) {
    batch.set(
      doc(db, paths.kid(kidId)),
      { schoolId: school.schoolId, classId: school.classId, updatedAt: ts() },
      { merge: true },
    );
  }
  batch.set(doc(db, paths.user(u)), { updatedAt: ts() }, { merge: true });
  await batch.commit();
  return { schoolId: school.schoolId, classId: school.classId, kidIds };
}
