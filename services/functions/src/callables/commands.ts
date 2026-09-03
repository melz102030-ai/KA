import { buildSmsCommand, paths, type SmsCommandKey } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

/**
 * Queue a control command for a watch. The companion APK (or the SMS bridge)
 * drains `watches/{watchId}/commands`. We also precompute the SMS string so the
 * bridge can dispatch it verbatim.
 */
export const sendWatchCommand = defineCallable("sendWatchCommand", async (input, { uid }) => {
  const watchSnap = await db.doc(paths.watch(input.watchId)).get();
  if (!watchSnap.exists) throw new HttpsError("not-found", "watch not found");

  const kidId: string | undefined = watchSnap.get("kidId");
  if (kidId) {
    const kid = await db.doc(paths.kid(kidId)).get();
    const guardians: string[] = kid.get("guardianUids") ?? [];
    if (!guardians.includes(uid)) {
      throw new HttpsError("permission-denied", "not a guardian of this watch's kid");
    }
  }

  const key = input.command as SmsCommandKey;
  let sms: string | null = null;
  try {
    sms = buildSmsCommand(key, input.params ?? {});
  } catch {
    sms = null; // command has no SMS form / missing params — APK-only
  }

  await db.collection(`${paths.watch(input.watchId)}/commands`).add({
    command: input.command,
    params: input.params ?? {},
    sms,
    requestedBy: uid,
    status: "queued",
    createdAt: now(),
  });

  return { dispatched: true };
});
