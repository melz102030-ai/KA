import type { AttendanceStatus } from "./enums.js";
import type { WatchCueKind } from "./schema/watch.js";

/**
 * What the child's watch shows the moment the teacher marks them.
 *
 * present — a buzz and a thumbs-up
 * late    — a ten-minute timer, counting down
 * absent  — a line saying the authorised guardian has been asked
 * excused — nothing at all
 *
 * The last one is the point of having a mapping instead of a switch inside the
 * screen: an excused absence is already agreed with the family, so buzzing the
 * child about it would be telling them off for something arranged for them.
 */

/** How long a late student has to reach class before the timer runs out. */
export const LATE_COUNTDOWN_SEC = 10 * 60;

/** A cue the child has not seen within this window is stale news. */
export const CUE_TTL_MS = 60 * 60 * 1000;

export const PRAISE_TEXT = "أحسنت — تم تسجيل حضورك";
export const LATE_TEXT = "أسرِع، تبقّى للحاق بالحصة";
export const ABSENT_TEXT = "بانتظار رد ولي الأمر المخوّل";

export type AttendanceCue = {
  cue: WatchCueKind;
  text: string;
  durationSec?: number;
  startedAt: number;
  expiresAt: number;
};

/** Returns null when the mark should not reach the watch at all. */
export function cueForAttendance(status: AttendanceStatus, now: number): AttendanceCue | null {
  const base = { startedAt: now, expiresAt: now + CUE_TTL_MS };
  switch (status) {
    case "present":
      return { ...base, cue: "praise", text: PRAISE_TEXT };
    case "late":
      return { ...base, cue: "countdown", text: LATE_TEXT, durationSec: LATE_COUNTDOWN_SEC };
    case "absent":
      return { ...base, cue: "notice", text: ABSENT_TEXT };
    case "excused":
      return null;
  }
}

/**
 * Seconds left on a countdown, from when the teacher acted — not from when the
 * watch happened to receive it.
 *
 * A KT37 that was asleep, out of coverage, or syncing on a slow interval can
 * pick a cue up minutes late. Counting a fresh ten minutes from delivery would
 * quietly hand that student the time back, and two students marked together
 * would see different deadlines. Clamped at zero so a late arrival shows an
 * expired timer rather than a negative one.
 */
export function countdownRemainingSec(
  cue: Pick<AttendanceCue, "startedAt" | "durationSec">,
  now: number,
): number {
  if (!cue.durationSec) return 0;
  const elapsed = Math.floor((now - cue.startedAt) / 1000);
  return Math.max(0, cue.durationSec - elapsed);
}

/** mm:ss for the watch face. */
export function formatCountdown(remainingSec: number): string {
  const s = Math.max(0, Math.floor(remainingSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
