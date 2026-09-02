import { paths, type AttendanceStatus } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

/**
 * Idempotent per (class, date, period): re-submitting updates the same session.
 * Server is the authority on the roster — marks for kids outside the class are dropped.
 */
export const submitAttendance = defineCallable("submitAttendance", async (input, { uid }) => {
  const classSnap = await db.doc(paths.class(input.schoolId, input.classId)).get();
  if (!classSnap.exists) throw new HttpsError("not-found", "class not found");
  const roster: string[] = classSnap.get("studentIds") ?? [];
  const rosterSet = new Set(roster);

  const sessionId = `${input.classId}_${input.date}${
    input.periodIndex != null ? `_p${input.periodIndex}` : ""
  }`;
  const sessionRef = db.doc(paths.attendanceSession(input.schoolId, sessionId));

  const counts: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, excused: 0 };
  const batch = db.batch();

  for (const mark of input.marks) {
    if (!rosterSet.has(mark.kidId)) continue;
    counts[mark.status] += 1;
    batch.set(db.doc(`${paths.attendanceRecords(input.schoolId, sessionId)}/${mark.kidId}`), {
      sessionId,
      kidId: mark.kidId,
      classId: input.classId,
      status: mark.status,
      method: mark.watchId ? "watch_scan" : "manual",
      markedBy: uid,
      markedAt: now(),
      ...(mark.watchId ? { watchId: mark.watchId } : {}),
    });
  }

  // kids on the roster with no mark are implicitly absent
  const marked = new Set(input.marks.map((m) => m.kidId));
  for (const kidId of roster) {
    if (marked.has(kidId)) continue;
    counts.absent += 1;
    batch.set(db.doc(`${paths.attendanceRecords(input.schoolId, sessionId)}/${kidId}`), {
      sessionId,
      kidId,
      classId: input.classId,
      status: "absent",
      method: "manual",
      markedBy: uid,
      markedAt: now(),
    });
  }

  batch.set(
    sessionRef,
    {
      id: sessionId,
      schoolId: input.schoolId,
      classId: input.classId,
      date: input.date,
      ...(input.periodIndex != null ? { periodIndex: input.periodIndex } : {}),
      takenBy: uid,
      finalizedAt: now(),
      counts,
      updatedAt: now(),
      createdAt: now(),
    },
    { merge: true },
  );

  await batch.commit();
  return { sessionId, counts };
});
