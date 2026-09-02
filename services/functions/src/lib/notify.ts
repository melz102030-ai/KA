import { paths } from "@akbadna/core";
import { db, messaging } from "./admin.js";

type Push = { title: string; body: string; data?: Record<string, string> };

/** Fan out an FCM push to every guardian of a kid. Missing tokens are ignored. */
export async function notifyGuardians(kidId: string, push: Push): Promise<void> {
  const kid = await db.doc(paths.kid(kidId)).get();
  const guardianUids: string[] = kid.get("guardianUids") ?? [];
  if (guardianUids.length === 0) return;

  const tokens: string[] = [];
  await Promise.all(
    guardianUids.map(async (uid) => {
      const u = await db.doc(paths.user(uid)).get();
      tokens.push(...((u.get("fcmTokens") as string[] | undefined) ?? []));
    }),
  );
  if (tokens.length === 0) return;

  await messaging.sendEachForMulticast({
    tokens,
    notification: { title: push.title, body: push.body },
    data: push.data ?? {},
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  });
}
