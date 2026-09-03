import { generateAkbadnaId, paths } from "@akbadna/core";
import { auth, db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

const PAIRING_TTL_MS = 10 * 60 * 1000;
const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));

/** Guardian starts pairing: reserves a watch doc + a short-lived code for the KT37. */
export const startWatchPairing = defineCallable("startWatchPairing", async (input, { uid }) => {
  const kidSnap = await db.doc(paths.kid(input.kidId)).get();
  if (!kidSnap.exists) throw new HttpsError("not-found", "kid not found");
  const guardians: string[] = kidSnap.get("guardianUids") ?? [];
  if (!guardians.includes(uid))
    throw new HttpsError("permission-denied", "not a guardian of this kid");

  // one watch per IMEI
  const existing = await db
    .collection(paths.watches())
    .where("imei", "==", input.imei)
    .limit(1)
    .get();
  const ref = existing.empty ? db.collection(paths.watches()).doc() : existing.docs[0]!.ref;

  const pairingCode = sixDigits();
  const expiresAt = now() + PAIRING_TTL_MS;

  await ref.set(
    {
      id: ref.id,
      model: "KT37",
      imei: input.imei,
      ...(input.simNumber ? { simNumber: input.simNumber } : {}),
      kidId: input.kidId,
      akbadnaId: kidSnap.get("akbadnaId") ?? generateAkbadnaId(),
      pairing: "pending",
      pairingCode,
      pairingCodeExpiresAt: expiresAt,
      link: "offline",
      updatedAt: now(),
      createdAt: existing.empty ? now() : (existing.docs[0]!.get("createdAt") ?? now()),
    },
    { merge: true },
  );

  return { watchId: ref.id, pairingCode, expiresAt };
});

/** The KT37 app submits the code; on success it gets its identity + a device token. */
export const confirmWatchPairing = defineCallable("confirmWatchPairing", async (input, { uid }) => {
  const q = await db.collection(paths.watches()).where("imei", "==", input.imei).limit(1).get();
  if (q.empty) throw new HttpsError("not-found", "watch not registered — start pairing first");
  const watch = q.docs[0]!;

  const code: string | undefined = watch.get("pairingCode");
  const exp: number = watch.get("pairingCodeExpiresAt") ?? 0;
  if (!code || code !== input.pairingCode.trim()) {
    throw new HttpsError("permission-denied", "invalid pairing code");
  }
  if (Date.now() > exp) throw new HttpsError("deadline-exceeded", "pairing code expired");

  const kidId: string | undefined = watch.get("kidId");

  await watch.ref.set(
    {
      pairing: "paired",
      pairingCode: null,
      pairingCodeExpiresAt: null,
      deviceUid: uid,
      link: "idle",
      updatedAt: now(),
    },
    { merge: true },
  );
  if (kidId) {
    await db.doc(paths.kid(kidId)).set({ watchId: watch.id, updatedAt: now() }, { merge: true });
  }

  // token the watch process re-authenticates with (claims scope it to this device)
  const deviceToken = await auth.createCustomToken(`watch_${watch.id}`, {
    role: "device",
    watchId: watch.id,
  });

  return { watchId: watch.id, kidId: kidId ?? "", deviceToken };
});
