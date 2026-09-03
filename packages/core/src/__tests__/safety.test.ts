import { describe, expect, it } from "vitest";
import { distanceMeters, isInside } from "../schema/safety";

const RIYADH = { lat: 24.7136, lng: 46.6753 };

describe("distanceMeters", () => {
  it("is ~0 for the same point", () => {
    expect(distanceMeters(RIYADH, RIYADH)).toBeCloseTo(0, 5);
  });

  it("matches a known separation (Riyadh → Jeddah ≈ 850 km)", () => {
    const jeddah = { lat: 21.4858, lng: 39.1925 };
    const km = distanceMeters(RIYADH, jeddah) / 1000;
    expect(km).toBeGreaterThan(830);
    expect(km).toBeLessThan(870);
  });

  it("is symmetric", () => {
    const a = { lat: 24.5, lng: 46.5 };
    const b = { lat: 24.6, lng: 46.7 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe("isInside", () => {
  const fence = { center: RIYADH, radiusM: 150 };
  it("true at the centre", () => {
    expect(isInside(fence, RIYADH)).toBe(true);
  });
  it("false well outside", () => {
    expect(isInside(fence, { lat: 24.72, lng: 46.69 })).toBe(false);
  });
  it("true just inside the radius", () => {
    // ~100 m north
    expect(isInside(fence, { lat: RIYADH.lat + 0.0009, lng: RIYADH.lng })).toBe(true);
  });
});
