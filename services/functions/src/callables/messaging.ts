import { FieldValue } from "firebase-admin/firestore";
import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

/** Post a message; creates the thread on first send. */
export const sendMessage = defineCallable("sendMessage", async (input, { uid }) => {
  const userSnap = await db.doc(paths.user(uid)).get();
  const senderName: string = userSnap.get("displayName") ?? "مستخدم";

  let threadId = input.threadId;
  if (!threadId) {
    const participants = Array.from(new Set([uid, ...(input.to ?? [])]));
    if (participants.length < 2) throw new HttpsError("invalid-argument", "لا يوجد مستقبِل");
    const tRef = db.collection(paths.threads()).doc();
    threadId = tRef.id;
    await tRef.set({
      id: threadId,
      channel: input.channel,
      participantUids: participants,
      ...(input.subjectRef ? { subjectRef: input.subjectRef } : {}),
      unread: Object.fromEntries(participants.filter((p) => p !== uid).map((p) => [p, 0])),
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    });
  } else {
    const t = await db.doc(paths.thread(threadId)).get();
    if (!t.exists) throw new HttpsError("not-found", "المحادثة غير موجودة");
    if (!(t.get("participantUids") as string[]).includes(uid)) {
      throw new HttpsError("permission-denied", "لست ضمن المحادثة");
    }
  }

  const mRef = db.collection(paths.messages(threadId)).doc();
  await mRef.set({
    id: mRef.id,
    threadId,
    senderUid: uid,
    senderName,
    text: input.text,
    at: now(),
    system: false,
    attachments: [],
    readBy: [uid],
  });

  const tRef = db.doc(paths.thread(threadId));
  const t = await tRef.get();
  const others = (t.get("participantUids") as string[]).filter((p) => p !== uid);
  const unreadInc: Record<string, FieldValue> = {};
  for (const p of others) unreadInc[`unread.${p}`] = FieldValue.increment(1);
  await tRef.set(
    {
      lastMessage: { text: input.text, senderUid: uid, at: now() },
      updatedAt: now(),
      ...unreadInc,
    },
    { merge: true },
  );

  return { threadId, messageId: mRef.id };
});
