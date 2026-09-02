import { onSchedule } from "firebase-functions/v2/scheduler";
import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";

const OFFLINE_AFTER_MS = 5 * 60 * 1000;

/** Every 5 min: flip watches with no recent telemetry to offline and mark their kid. */
export const watchOfflineSweep = onSchedule(
  { region: "europe-west1", schedule: "every 5 minutes" },
  async () => {
    const cutoff = now() - OFFLINE_AFTER_MS;
    const stale = await db
      .collection(paths.watches())
      .where("link", "in", ["online", "idle"])
      .where("lastSeenAt", "<", cutoff)
      .get();

    const batch = db.batch();
    for (const w of stale.docs) {
      batch.set(w.ref, { link: "offline", updatedAt: now() }, { merge: true });
      const kidId: string | undefined = w.get("kidId");
      if (kidId) {
        batch.set(
          db.doc(paths.kid(kidId)),
          { live: { watchOnline: false }, updatedAt: now() },
          { merge: true },
        );
      }
    }
    if (!stale.empty) await batch.commit();
  },
);
