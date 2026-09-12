import { describe, expect, it } from "vitest";
import { distanceM, livePresence, suggestedStatus } from "../presence.js";

// A real campus: Riyadh, and points measured out from it.
const SCHOOL = { lat: 24.7136, lng: 46.6753 };

/**
 * Moves north by a known number of metres. Uses the same spherical earth the
 * implementation does (1° of latitude = πR/180 ≈ 111_195 m) — the WGS84 figure
 * of 111_320 would make the helper, not the code, the source of the error.
 */
const METRES_PER_DEGREE = (Math.PI * 6_371_000) / 180;
const north = (metres: number) => ({
  lat: SCHOOL.lat + metres / METRES_PER_DEGREE,
  lng: SCHOOL.lng,
});

const NOW = 1_800_000_000_000;
const base = { schoolLocation: SCHOOL, campusRadiusM: 150, now: NOW, lastTelemetryAt: NOW - 1000 };

describe("distanceM", () => {
  it("is zero for the same point", () => {
    expect(distanceM(SCHOOL, SCHOOL)).toBe(0);
  });

  it("matches a known offset within a metre", () => {
    expect(distanceM(SCHOOL, north(500))).toBeCloseTo(500, 0);
  });

  it("is symmetric", () => {
    expect(distanceM(SCHOOL, north(250))).toBeCloseTo(distanceM(north(250), SCHOOL), 6);
  });
});

describe("livePresence", () => {
  it("counts a student inside the fence as present", () => {
    expect(livePresence({ ...base, kidLocation: north(100) })).toBe("present");
  });

  it("treats the fence edge as inside, not outside", () => {
    expect(livePresence({ ...base, kidLocation: north(150) })).toBe("present");
  });

  it("counts the approach band as nearby", () => {
    expect(livePresence({ ...base, kidLocation: north(300) })).toBe("nearby");
    expect(livePresence({ ...base, kidLocation: north(450) })).toBe("nearby");
  });

  it("counts beyond the band as away", () => {
    expect(livePresence({ ...base, kidLocation: north(451) })).toBe("away");
    expect(livePresence({ ...base, kidLocation: north(5000) })).toBe("away");
  });

  it("honours a custom band", () => {
    expect(livePresence({ ...base, kidLocation: north(200), nearbyBandM: 10 })).toBe("away");
  });

  // The cases that must never silently become an absence.
  it("is unknown without a watch fix", () => {
    expect(livePresence({ ...base })).toBe("unknown");
  });

  it("is unknown when the school has no coordinates", () => {
    expect(livePresence({ ...base, schoolLocation: undefined, kidLocation: north(10) })).toBe(
      "unknown",
    );
  });

  it("is unknown once the fix goes stale", () => {
    expect(
      livePresence({ ...base, kidLocation: north(10), lastTelemetryAt: NOW - 11 * 60 * 1000 }),
    ).toBe("unknown");
  });

  it("still trusts a fix inside the staleness window", () => {
    expect(
      livePresence({ ...base, kidLocation: north(10), lastTelemetryAt: NOW - 9 * 60 * 1000 }),
    ).toBe("present");
  });
});

describe("suggestedStatus", () => {
  it("maps each reading to the mark a teacher would expect", () => {
    expect(suggestedStatus("present")).toBe("present");
    expect(suggestedStatus("nearby")).toBe("late");
    expect(suggestedStatus("away")).toBe("absent");
  });

  it("suggests nothing for unknown, so a flat battery marks nobody", () => {
    expect(suggestedStatus("unknown")).toBeUndefined();
  });
});
