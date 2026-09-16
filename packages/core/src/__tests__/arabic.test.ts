import { describe, expect, it } from "vitest";
import { NOUNS, arabicCount } from "../arabic.js";

describe("arabicCount", () => {
  it("says one and two without a digit", () => {
    expect(arabicCount(1, NOUNS.problem)).toBe("مشكلة واحدة");
    expect(arabicCount(2, NOUNS.problem)).toBe("مشكلتان");
  });

  it("puts the digit before the broken plural for three to ten", () => {
    expect(arabicCount(3, NOUNS.problem)).toBe("3 مشكلات");
    expect(arabicCount(10, NOUNS.problem)).toBe("10 مشكلات");
  });

  it("returns to the singular above ten", () => {
    expect(arabicCount(11, NOUNS.problem)).toBe("11 مشكلةً");
    expect(arabicCount(100, NOUNS.problem)).toBe("100 مشكلةً");
  });

  it("has a sentence for none rather than a bare zero", () => {
    expect(arabicCount(0, NOUNS.student)).toBe("لا طلاب");
  });

  // Counts arrive from .length and from arithmetic; neither should ever print
  // a minus sign or a decimal point inside a sentence.
  it("ignores sign and fraction", () => {
    expect(arabicCount(-3, NOUNS.problem)).toBe("3 مشكلات");
    expect(arabicCount(2.7, NOUNS.problem)).toBe("مشكلتان");
  });

  it("counts school days and periods too", () => {
    expect(arabicCount(5, NOUNS.schoolDay)).toBe("5 أيام دراسية");
    expect(arabicCount(1, NOUNS.schoolDay)).toBe("يوم دراسي واحد");
    expect(arabicCount(7, NOUNS.period)).toBe("7 حصص");
  });
});
