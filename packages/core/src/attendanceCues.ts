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

/* ── Praise for standing out in a lesson ─────────────────────────────────── */

/** What the teacher may award. The child sees the glyph itself on the watch. */
export const REWARD_GLYPHS = ["🤩", "👍", "👏"] as const;
export type RewardGlyph = (typeof REWARD_GLYPHS)[number];

export const REWARD_LABELS: Record<RewardGlyph, string> = {
  "🤩": "نجوم في عينيه",
  "👍": "إعجاب",
  "👏": "تصفيق",
};

export const REWARD_TEXT = "تميّزت اليوم في الحصة";

/**
 * The offset of `timeZone` from UTC at a given instant, in milliseconds.
 * Derived from Intl rather than assumed, so a zone that observes DST is handled
 * without a table.
 */
function tzOffsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    n("year"),
    n("month") - 1,
    n("day"),
    n("hour"),
    n("minute"),
    n("second"),
  );
  // Drop sub-second noise: the parts have none, so `at` must not either.
  return wallClockAsUtc - Math.floor(at / 1000) * 1000;
}

/**
 * The instant the school's day ends — midnight at the start of tomorrow, in the
 * school's own timezone. A reward given during the last lesson should sit on
 * the child's wrist all evening and be gone by morning.
 *
 * Two passes: the offset is read at `now`, the candidate midnight computed, then
 * the offset re-read AT that candidate. Across a DST boundary the two differ,
 * and using the first would land the expiry an hour out.
 */
export function endOfDayMs(now: number, timeZone = "Asia/Riyadh"): number {
  const midnightFor = (offset: number) => {
    const local = new Date(now + offset);
    const startOfNextLocalDay = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() + 1,
    );
    return startOfNextLocalDay - offset;
  };
  const first = midnightFor(tzOffsetMs(now, timeZone));
  return midnightFor(tzOffsetMs(first, timeZone));
}

/** A "you stood out today" cue, alive until the school day is over. */
export function rewardCue(
  glyph: RewardGlyph,
  now: number,
  timeZone?: string,
): AttendanceCue & { glyph: RewardGlyph } {
  return {
    cue: "praise",
    glyph,
    text: REWARD_TEXT,
    startedAt: now,
    expiresAt: endOfDayMs(now, timeZone),
  };
}
