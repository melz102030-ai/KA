import { describe, expect, it } from "vitest";
import {
  ABSENT_TEXT,
  CUE_TTL_MS,
  LATE_COUNTDOWN_SEC,
  countdownRemainingSec,
  cueForAttendance,
  formatCountdown,
} from "../attendanceCues.js";

const NOW = 1_800_000_000_000;

describe("cueForAttendance", () => {
  it("praises a present student", () => {
    const c = cueForAttendance("present", NOW);
    expect(c?.cue).toBe("praise");
    expect(c?.durationSec).toBeUndefined();
  });

  it("gives a late student a ten-minute countdown", () => {
    const c = cueForAttendance("late", NOW);
    expect(c?.cue).toBe("countdown");
    expect(c?.durationSec).toBe(LATE_COUNTDOWN_SEC);
    expect(c?.durationSec).toBe(600);
  });

  it("tells an absent student their guardian has been asked", () => {
    const c = cueForAttendance("absent", NOW);
    expect(c?.cue).toBe("notice");
    expect(c?.text).toBe(ABSENT_TEXT);
  });

  // The child already knows about an excused absence; buzzing them would be
  // telling them off for something arranged on their behalf.
  it("sends nothing at all for an excused absence", () => {
    expect(cueForAttendance("excused", NOW)).toBeNull();
  });

  it("stamps the teacher's clock and an expiry", () => {
    const c = cueForAttendance("present", NOW);
    expect(c?.startedAt).toBe(NOW);
    expect(c?.expiresAt).toBe(NOW + CUE_TTL_MS);
  });
});

describe("countdownRemainingSec", () => {
  const cue = { startedAt: NOW, durationSec: 600 };

  it("is the full duration at the moment it is issued", () => {
    expect(countdownRemainingSec(cue, NOW)).toBe(600);
  });

  it("counts down in real time", () => {
    expect(countdownRemainingSec(cue, NOW + 60_000)).toBe(540);
    expect(countdownRemainingSec(cue, NOW + 599_000)).toBe(1);
  });

  // The reason startedAt is the teacher's clock and not the delivery time.
  it("does not restart when the watch receives it late", () => {
    const deliveredAfter4Min = NOW + 4 * 60_000;
    expect(countdownRemainingSec(cue, deliveredAfter4Min)).toBe(360);
    expect(countdownRemainingSec(cue, deliveredAfter4Min)).not.toBe(600);
  });

  it("clamps at zero instead of going negative", () => {
    expect(countdownRemainingSec(cue, NOW + 900_000)).toBe(0);
  });

  it("is zero for a cue that carries no duration", () => {
    expect(countdownRemainingSec({ startedAt: NOW }, NOW)).toBe(0);
  });
});

describe("formatCountdown", () => {
  it("pads to mm:ss", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(9)).toBe("00:09");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("never renders a negative clock", () => {
    expect(formatCountdown(-30)).toBe("00:00");
  });
});
