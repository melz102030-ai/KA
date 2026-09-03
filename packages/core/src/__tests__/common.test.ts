import { describe, expect, it } from "vitest";
import { AkbadnaId, generateAkbadnaId, Money, SaudiPhone } from "../common";

describe("generateAkbadnaId", () => {
  it("matches the AKB-XXXX-XXXX shape", () => {
    for (let i = 0; i < 200; i++) {
      expect(AkbadnaId.safeParse(generateAkbadnaId()).success).toBe(true);
    }
  });

  it("never uses ambiguous characters (I, O, 0, 1)", () => {
    let seed = 0.001;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 100; i++) {
      expect(generateAkbadnaId(rand)).not.toMatch(/[IO01]/);
    }
  });

  it("is deterministic for a fixed rng", () => {
    const fixed = () => 0.42;
    expect(generateAkbadnaId(fixed)).toBe(generateAkbadnaId(fixed));
  });
});

describe("SaudiPhone", () => {
  it.each(["+966501234567", "+966555555555"])("accepts %s", (v) => {
    expect(SaudiPhone.safeParse(v).success).toBe(true);
  });
  it.each(["0501234567", "+96650123456", "+96650123456789", "966501234567"])("rejects %s", (v) => {
    expect(SaudiPhone.safeParse(v).success).toBe(false);
  });
});

describe("Money", () => {
  it("defaults currency to SAR", () => {
    expect(Money.parse({ amount: 1500 })).toEqual({ amount: 1500, currency: "SAR" });
  });
  it("rejects non-integer minor units", () => {
    expect(Money.safeParse({ amount: 12.5 }).success).toBe(false);
  });
});
