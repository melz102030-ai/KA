import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";
import { notifyGuardians } from "../lib/notify.js";

export const resolveAkbadnaId = defineCallable("resolveAkbadnaId", async (input) => {
  const q = await db
    .collection(paths.kids())
    .where("akbadnaId", "==", input.akbadnaId)
    .limit(1)
    .get();
  if (q.empty) return null;
  const kid = q.docs[0]!;
  let schoolName: string | undefined;
  const schoolId: string | undefined = kid.get("schoolId");
  if (schoolId) {
    const s = await db.doc(paths.school(schoolId)).get();
    schoolName = s.get("name") ?? undefined;
  }
  return { kidId: kid.id, displayName: kid.get("name"), schoolName };
});

export const raiseSos = defineCallable("raiseSos", async (input) => {
  const watch = await db.doc(paths.watch(input.watchId)).get();
  if (!watch.exists) throw new HttpsError("not-found", "watch not found");
  const kidId: string | undefined = watch.get("kidId");

  const ref = db.collection(paths.alerts()).doc();
  await ref.set({
    id: ref.id,
    kind: "sos",
    severity: "critical",
    state: "open",
    watchId: input.watchId,
    ...(kidId ? { kidId } : {}),
    title: "طلب استغاثة SOS",
    detail: "تم تفعيل زر الاستغاثة من الساعة",
    location: { lat: input.lat, lng: input.lng },
    raisedAt: now(),
    notifiedUids: [] as string[],
    createdAt: now(),
    updatedAt: now(),
  });

  if (kidId)
    await notifyGuardians(kidId, {
      title: "🆘 استغاثة",
      body: "طفلك فعّل زر الاستغاثة — افتح التطبيق الآن",
      data: { alertId: ref.id, kind: "sos" },
    });

  return { alertId: ref.id };
});
