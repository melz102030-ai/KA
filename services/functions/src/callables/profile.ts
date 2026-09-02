import { FieldValue } from "firebase-admin/firestore";
import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable } from "../lib/callable.js";

export const bootstrapProfile = defineCallable("bootstrapProfile", async (input, { uid }) => {
  const ref = db.doc(paths.user(uid));
  const snap = await ref.get();
  if (snap.exists) {
    await ref.set({ updatedAt: now() }, { merge: true });
    return { uid, created: false };
  }
  await ref.set({
    uid,
    displayName: input.displayName,
    roles: [input.activeRole],
    activeRole: input.activeRole,
    locale: input.locale,
    fcmTokens: [] as string[],
    disabled: false,
    createdAt: now(),
    updatedAt: now(),
  });
  void FieldValue; // reserved for array unions on token registration
  return { uid, created: true };
});
