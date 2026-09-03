import { FieldValue } from "firebase-admin/firestore";
import { generateAkbadnaId, generateJoinCode, paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

const membershipId = (uid: string, schoolId: string, role: string) => `${uid}_${schoolId}_${role}`;

/** Parent onboarding — create the caller's kids. */
export const createFamily = defineCallable("createFamily", async (input, { uid }) => {
  const batch = db.batch();
  const kidIds: string[] = [];
  for (const k of input.kids) {
    const ref = db.collection(paths.kids()).doc();
    kidIds.push(ref.id);
    batch.set(ref, {
      id: ref.id,
      name: k.name,
      ...(k.gradeLabel ? { gradeLabel: k.gradeLabel } : {}),
      guardianUids: [uid],
      akbadnaId: generateAkbadnaId(),
      live: { presence: "unknown", watchOnline: false },
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  batch.set(
    db.doc(paths.user(uid)),
    { roles: FieldValue.arrayUnion("parent"), onboardedAt: now(), updatedAt: now() },
    { merge: true },
  );
  await batch.commit();
  return { kidIds };
});

/** Teacher/admin onboarding — create a school + first class, with a join code. */
export const createSchoolWithClass = defineCallable(
  "createSchoolWithClass",
  async (input, { uid }) => {
    const schoolRef = db.collection(paths.schools()).doc();
    const classRef = db.collection(paths.classes(schoolRef.id)).doc();
    const code = generateJoinCode();

    const batch = db.batch();
    batch.set(schoolRef, {
      id: schoolRef.id,
      name: input.schoolName,
      campusRadiusM: 150,
      timezone: "Asia/Riyadh",
      weekDays: [0, 1, 2, 3, 4],
      adminUids: [uid],
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    });
    batch.set(classRef, {
      id: classRef.id,
      schoolId: schoolRef.id,
      name: input.className,
      grade: input.grade,
      homeroomTeacherId: uid,
      teacherIds: [uid],
      studentIds: [],
      schedule: {},
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    });
    batch.set(db.doc(paths.joinCode(code)), {
      code,
      schoolId: schoolRef.id,
      classId: classRef.id,
      role: "parent",
      createdByUid: uid,
      uses: 0,
      createdAt: now(),
      updatedAt: now(),
    });
    for (const role of ["teacher", "school_admin"] as const) {
      const id = membershipId(uid, schoolRef.id, role);
      batch.set(db.doc(paths.membership(id)), {
        id,
        uid,
        schoolId: schoolRef.id,
        role,
        classIds: role === "teacher" ? [classRef.id] : [],
        kidIds: [],
        acceptedAt: now(),
        createdAt: now(),
        updatedAt: now(),
      });
    }
    batch.set(
      db.doc(paths.user(uid)),
      {
        roles: FieldValue.arrayUnion("teacher", "school_admin"),
        onboardedAt: now(),
        updatedAt: now(),
      },
      { merge: true },
    );
    await batch.commit();
    return { schoolId: schoolRef.id, classId: classRef.id, joinCode: code };
  },
);

/** Join a school/class by code. */
export const joinByCode = defineCallable("joinByCode", async (input, { uid }) => {
  const codeSnap = await db.doc(paths.joinCode(input.code.toUpperCase())).get();
  if (!codeSnap.exists) throw new HttpsError("not-found", "رمز غير صحيح");
  const c = codeSnap.data() as {
    schoolId: string;
    classId?: string;
    expiresAt?: number;
    uses: number;
    maxUses?: number;
  };
  if (c.expiresAt && Date.now() > c.expiresAt)
    throw new HttpsError("deadline-exceeded", "انتهت صلاحية الرمز");
  if (c.maxUses && c.uses >= c.maxUses) throw new HttpsError("resource-exhausted", "استُنفد الرمز");

  const role = input.asRole === "teacher" ? "teacher" : "parent";
  const id = membershipId(uid, c.schoolId, role);
  const batch = db.batch();
  batch.set(db.doc(paths.membership(id)), {
    id,
    uid,
    schoolId: c.schoolId,
    role,
    classIds: c.classId ? [c.classId] : [],
    kidIds: input.kidIds,
    acceptedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });
  if (c.classId && input.kidIds.length) {
    batch.set(
      db.doc(paths.class(c.schoolId, c.classId)),
      { studentIds: FieldValue.arrayUnion(...input.kidIds), updatedAt: now() },
      { merge: true },
    );
    for (const kidId of input.kidIds) {
      batch.set(
        db.doc(paths.kid(kidId)),
        { schoolId: c.schoolId, classId: c.classId, updatedAt: now() },
        { merge: true },
      );
    }
  }
  batch.set(codeSnap.ref, { uses: FieldValue.increment(1) }, { merge: true });
  batch.set(
    db.doc(paths.user(uid)),
    { roles: FieldValue.arrayUnion(role), updatedAt: now() },
    { merge: true },
  );
  await batch.commit();
  return { schoolId: c.schoolId, classId: c.classId };
});

/** Add one kid to the caller's family. */
export const addKid = defineCallable("addKid", async (input, { uid }) => {
  const ref = db.collection(paths.kids()).doc();
  const akbadnaId = generateAkbadnaId();
  await ref.set({
    id: ref.id,
    name: input.name,
    ...(input.gradeLabel ? { gradeLabel: input.gradeLabel } : {}),
    ...(input.schoolId ? { schoolId: input.schoolId } : {}),
    ...(input.classId ? { classId: input.classId } : {}),
    guardianUids: [uid],
    akbadnaId,
    live: { presence: "unknown", watchOnline: false },
    createdBy: uid,
    createdAt: now(),
    updatedAt: now(),
  });
  if (input.schoolId && input.classId) {
    await db
      .doc(paths.class(input.schoolId, input.classId))
      .set({ studentIds: FieldValue.arrayUnion(ref.id), updatedAt: now() }, { merge: true });
  }
  return { kidId: ref.id, akbadnaId };
});
