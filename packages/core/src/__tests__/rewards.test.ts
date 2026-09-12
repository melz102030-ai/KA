import { describe, expect, it } from "vitest";
import { REWARD_GLYPHS, REWARD_LABELS, endOfDayMs, rewardCue } from "../attendanceCues.js";

/** Renders an instant as wall-clock text in a zone, for readable assertions. */
const wall = (ms: number, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));

describe("endOfDayMs", () => {
  it("lands on midnight that starts the next local day", () => {
    // 2026-09-12 14:30 in Riyadh (UTC+3).
    const now = Date.UTC(2026, 8, 12, 11, 30);
    expect(wall(endOfDayMs(now, "Asia/Riyadh"), "Asia/Riyadh")).toBe("2026-09-13, 00:00");
  });

  it("is always in the future, even one minute before midnight", () => {
    const now = Date.UTC(2026, 8, 12, 20, 59); // 23:59 Riyadh
    const end = endOfDayMs(now, "Asia/Riyadh");
    expect(end).toBeGreaterThan(now);
    expect(end - now).toBe(60_000);
  });

  it("rolls to the next day just after midnight, not back", () => {
    const now = Date.UTC(2026, 8, 12, 21, 1); // 00:01 Riyadh on the 13th
    expect(wall(endOfDayMs(now, "Asia/Riyadh"), "Asia/Riyadh")).toBe("2026-09-14, 00:00");
  });

  it("defaults to the school timezone", () => {
    const now = Date.UTC(2026, 8, 12, 11, 30);
    expect(endOfDayMs(now)).toBe(endOfDayMs(now, "Asia/Riyadh"));
  });

  // The reason the offset is read twice. On this date the zone shifts overnight,
  // so the offset at "now" and at the resulting midnight are not the same.
  it("still lands on local midnight across a DST change", () => {
    // 2026-03-28 in London: the clocks go forward at 01:00 on the 29th.
    const now = Date.UTC(2026, 2, 28, 15, 0);
    expect(wall(endOfDayMs(now, "Europe/London"), "Europe/London")).toBe("2026-03-29, 00:00");
  });

  it("handles a zone behind UTC", () => {
    const now = Date.UTC(2026, 8, 12, 18, 0); // 14:00 in New York
    expect(wall(endOfDayMs(now, "America/New_York"), "America/New_York")).toBe("2026-09-13, 00:00");
  });
});

describe("rewardCue", () => {
  const NOW = Date.UTC(2026, 8, 12, 8, 0);

  it("carries the glyph the teacher chose", () => {
    for (const g of REWARD_GLYPHS) {
      expect(rewardCue(g, NOW).glyph).toBe(g);
    }
  });

  it("expires at the end of the school day, not an hour later", () => {
    expect(rewardCue("🤩", NOW).expiresAt).toBe(endOfDayMs(NOW, "Asia/Riyadh"));
  });

  it("outlives the rest of the lessons", () => {
    const c = rewardCue("👏", NOW);
    expect(c.expiresAt - c.startedAt).toBeGreaterThan(8 * 60 * 60 * 1000);
  });

  it("every glyph is named in Arabic for the teacher's picker", () => {
    for (const g of REWARD_GLYPHS) expect(REWARD_LABELS[g]).toBeTruthy();
  });
});
