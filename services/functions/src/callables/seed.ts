import { generateAkbadnaId, paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable } from "../lib/callable.js";

/**
 * Idempotent per-user demo seed. Creates a school, a class, two kids guarded by
 * the caller, and memberships as both parent and teacher. Re-running is a no-op.
 */
export const seedDemoSchool = defineCallable("seedDemoSchool", async (_input, { uid }) => {
  const schoolId = `demo_${uid.slice(0, 8)}`;
  const classId = `${schoolId}_c1`;
  const kidIds = [`${schoolId}_k1`, `${schoolId}_k2`];

  const batch = db.batch();

  batch.set(
    db.doc(paths.school(schoolId)),
    {
      id: schoolId,
      name: "مدرسة أكبادنا التجريبية",
      campusRadiusM: 150,
      timezone: "Asia/Riyadh",
      weekDays: [0, 1, 2, 3, 4],
      createdAt: now(),
      updatedAt: now(),
    },
    { merge: true },
  );

  batch.set(
    db.doc(paths.class(schoolId, classId)),
    {
      id: classId,
      schoolId,
      name: "أول متوسط - أ",
      grade: "أول متوسط",
      homeroomTeacherId: uid,
      teacherIds: [uid],
      studentIds: kidIds,
      schedule: {},
      createdAt: now(),
      updatedAt: now(),
    },
    { merge: true },
  );

  const kids = [
    { id: kidIds[0]!, name: "أحمد محمد الغامدي", photoEmoji: "👦", gradeLabel: "أول متوسط - أ" },
    { id: kidIds[1]!, name: "منى محمد الغامدي", photoEmoji: "👧", gradeLabel: "ثاني ابتدائي - ب" },
  ];
  for (const k of kids) {
    batch.set(
      db.doc(paths.kid(k.id)),
      {
        id: k.id,
        name: k.name,
        photoEmoji: k.photoEmoji,
        gradeLabel: k.gradeLabel,
        schoolId,
        classId,
        guardianUids: [uid],
        akbadnaId: generateAkbadnaId(),
        live: { presence: "in_class", watchOnline: false },
        createdAt: now(),
        updatedAt: now(),
      },
      { merge: true },
    );
  }

  for (const role of ["parent", "teacher"] as const) {
    const id = `${uid}_${schoolId}_${role}`;
    batch.set(
      db.doc(paths.membership(id)),
      {
        id,
        uid,
        schoolId,
        role,
        kidIds: role === "parent" ? kidIds : [],
        classIds: role === "teacher" ? [classId] : [],
        acceptedAt: now(),
        createdAt: now(),
        updatedAt: now(),
      },
      { merge: true },
    );
  }

  batch.set(
    db.doc(paths.user(uid)),
    { roles: ["parent", "teacher"], updatedAt: now() },
    { merge: true },
  );

  await batch.commit();
  return { schoolId, classId, kidIds };
});
