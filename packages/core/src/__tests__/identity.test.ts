import { describe, expect, it } from "vitest";
import { isValidNationalId, nationalIdCheckDigit, nationalIdProblem } from "../identity.js";

/** Completes a nine-digit prefix into a well-formed id. */
const complete = (firstNine: string) => firstNine + nationalIdCheckDigit(firstNine);

describe("isValidNationalId", () => {
  it("accepts ids it completed itself, for both prefixes", () => {
    for (const prefix of ["1", "2"]) {
      for (const body of ["00000000", "23456789", "98765432", "11111111"]) {
        expect(isValidNationalId(complete(prefix + body))).toBe(true);
      }
    }
  });

  it("rejects anything that is not ten digits", () => {
    expect(isValidNationalId("")).toBe(false);
    expect(isValidNationalId("101234567")).toBe(false);
    expect(isValidNationalId("10123456789")).toBe(false);
    expect(isValidNationalId("10123abc78")).toBe(false);
    expect(isValidNationalId("1012345678 ")).toBe(false);
  });

  it("rejects prefixes other than 1 or 2", () => {
    for (const p of ["0", "3", "5", "9"]) {
      const body = "12345678";
      // Borrow a valid check digit; the prefix alone must sink it.
      expect(isValidNationalId(p + body + "0")).toBe(false);
    }
  });

  // What the checksum is actually for.
  it("catches any single mistyped digit", () => {
    const valid = complete("123456789");
    let caught = 0;
    for (let i = 0; i < 10; i++) {
      for (let d = 0; d <= 9; d++) {
        if (Number(valid[i]) === d) continue;
        const typo = valid.slice(0, i) + d + valid.slice(i + 1);
        if (!isValidNationalId(typo)) caught++;
      }
    }
    expect(caught).toBe(9 * 10); // every one of the 90 single-digit variants
  });

  it("catches neighbouring digits swapped", () => {
    const valid = complete("123456789");
    let checked = 0;
    for (let i = 0; i < 9; i++) {
      if (valid[i] === valid[i + 1]) continue;
      const swapped = valid.slice(0, i) + valid[i + 1] + valid[i] + valid.slice(i + 2);
      expect(isValidNationalId(swapped)).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("nationalIdProblem", () => {
  it("names the specific fault", () => {
    expect(nationalIdProblem("")).toBe("empty");
    expect(nationalIdProblem("   ")).toBe("empty");
    expect(nationalIdProblem("123")).toBe("length");
    expect(nationalIdProblem("3123456789")).toBe("prefix");
    expect(nationalIdProblem("1234567890")).toBe("checksum");
  });

  it("is null for a good id", () => {
    expect(nationalIdProblem(complete("123456789"))).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(nationalIdProblem(`  ${complete("123456789")}  `)).toBeNull();
  });
});

describe("nationalIdCheckDigit", () => {
  it("refuses a prefix that is not nine digits starting 1 or 2", () => {
    expect(() => nationalIdCheckDigit("12345678")).toThrow();
    expect(() => nationalIdCheckDigit("323456789")).toThrow();
  });

  it("is deterministic", () => {
    expect(nationalIdCheckDigit("123456789")).toBe(nationalIdCheckDigit("123456789"));
  });
});
