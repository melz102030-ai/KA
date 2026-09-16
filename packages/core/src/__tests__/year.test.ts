import { describe, expect, it } from "vitest";
import {
  CLOSE_YEAR_MESSAGES,
  LAST_GRADE,
  closeYearProblem,
  closingStatus,
  continuesNextYear,
  currentSchoolYear,
  defaultOutcome,
  gradeAfter,
  nextClassGrade,
  nextYearId,
  rolloverPlan,
  yearLabel,
} from "../year.js";

describe("year naming", () => {
  it("spells the year the way a school does", () => {
    expect(yearLabel(1447)).toBe("1447 / 1448 هـ");
    expect(nextYearId(1447)).toBe(1448);
  });

  it("suggests a plausible Hijri year for today", () => {
    const y = currentSchoolYear(Date.UTC(2026, 8, 16));
    expect(y).toBeGreaterThan(1440);
    expect(y).toBeLessThan(1460);
  });
});

describe("defaultOutcome", () => {
  it("moves everyone up by default", () => {
    expect(defaultOutcome(1)).toBe("promote");
    expect(defaultOutcome(11)).toBe("promote");
  });

  it("graduates the last grade", () => {
    expect(defaultOutcome(LAST_GRADE)).toBe("graduate");
  });

  /**
   * The rule the whole module exists to protect: a half-filled record must not
   * be promoted into a grade the system invented for it.
   */
  it("refuses to guess when the grade is missing or impossible", () => {
    expect(defaultOutcome(undefined)).toBeNull();
    expect(defaultOutcome(0)).toBeNull();
    expect(defaultOutcome(13)).toBeNull();
    expect(defaultOutcome(4.5)).toBeNull();
  });
});

describe("gradeAfter", () => {
  it("adds a year for a promotion and keeps the grade for a repeat", () => {
    expect(gradeAfter(5, "promote")).toBe(6);
    expect(gradeAfter(5, "repeat")).toBe(5);
  });

  it("puts nobody past the last grade", () => {
    expect(gradeAfter(LAST_GRADE, "promote")).toBeNull();
    expect(gradeAfter(LAST_GRADE, "graduate")).toBeNull();
  });

  it("leaves the ladder on transfer", () => {
    expect(gradeAfter(3, "transfer")).toBeNull();
  });

  // A repeated final year is a real case — it must not be turned into a
  // graduation by the "last grade" shortcut.
  it("lets the last grade be repeated", () => {
    expect(gradeAfter(LAST_GRADE, "repeat")).toBe(LAST_GRADE);
    expect(continuesNextYear("repeat")).toBe(true);
  });
});

describe("closingStatus", () => {
  it("stamps the closed record with what actually happened", () => {
    expect(closingStatus("graduate")).toBe("graduated");
    expect(closingStatus("transfer")).toBe("transferred");
    expect(closingStatus("promote")).toBe("active");
    expect(closingStatus("repeat")).toBe("active");
  });

  it("knows who carries on into next year", () => {
    expect(continuesNextYear("promote")).toBe(true);
    expect(continuesNextYear("graduate")).toBe(false);
    expect(continuesNextYear("transfer")).toBe(false);
  });
});

describe("rolloverPlan", () => {
  const students = [
    { kidId: "a", name: "سعد", grade: 5 },
    { kidId: "b", name: "نورة", grade: LAST_GRADE },
    { kidId: "c", name: "فهد", grade: 5 },
    { kidId: "d", name: "بلا صف" },
  ];

  it("gives every active child a row", () => {
    expect(rolloverPlan(students).rows).toHaveLength(4);
  });

  it("counts the outcomes so the teacher sees the year at a glance", () => {
    const p = rolloverPlan(students);
    expect(p.counts.promote).toBe(2);
    expect(p.counts.graduate).toBe(1);
    expect(p.counts.repeat).toBe(0);
  });

  it("separates the children it cannot decide for", () => {
    const p = rolloverPlan(students);
    expect(p.needsReview.map((r) => r.kidId)).toEqual(["d"]);
    expect(p.ready).toBe(false);
  });

  it("is ready once the last undecided child is decided", () => {
    const p = rolloverPlan(students, { d: "transfer" });
    expect(p.needsReview).toEqual([]);
    expect(p.ready).toBe(true);
    expect(p.counts.transfer).toBe(1);
  });

  it("honours a teacher's override against the default", () => {
    const p = rolloverPlan(students, { a: "repeat" });
    const row = p.rows.find((r) => r.kidId === "a")!;
    expect(row.outcome).toBe("repeat");
    expect(row.toGrade).toBe(5);
    expect(p.counts.promote).toBe(1);
    expect(p.counts.repeat).toBe(1);
  });

  // A child who left in March must not be swept up in June's promotion.
  it("skips children whose enrolment already closed", () => {
    const p = rolloverPlan([
      { kidId: "a", grade: 5 },
      { kidId: "gone", grade: 5, enrolmentStatus: "transferred" as const },
      { kidId: "no", grade: 5, enrolmentStatus: "rejected" as const },
      { kidId: "waiting", grade: 5, enrolmentStatus: "pending" as const },
    ]);
    expect(p.rows.map((r) => r.kidId)).toEqual(["a"]);
  });

  it("is not ready when there is nobody at all", () => {
    expect(rolloverPlan([]).ready).toBe(false);
  });
});

describe("closeYearProblem", () => {
  const ready = rolloverPlan([{ kidId: "a", grade: 5 }]);
  const base = { status: "active" as const, plan: ready, now: 200, endsAt: 100 };

  it("lets a finished, fully decided year close", () => {
    expect(closeYearProblem(base)).toBeNull();
  });

  it("refuses a year that never started or already ended", () => {
    expect(closeYearProblem({ ...base, status: "planned" })).toBe("not-active");
    expect(closeYearProblem({ ...base, status: "archived" })).toBe("not-active");
  });

  it("refuses an empty year", () => {
    expect(closeYearProblem({ ...base, plan: rolloverPlan([]) })).toBe("nothing-to-close");
  });

  it("refuses while any child is undecided", () => {
    const undecided = rolloverPlan([{ kidId: "x" }]);
    expect(closeYearProblem({ ...base, plan: undecided })).toBe("undecided");
  });

  it("refuses before the end date, unless the school insists", () => {
    expect(closeYearProblem({ ...base, now: 50 })).toBe("too-early");
    expect(closeYearProblem({ ...base, now: 50, force: true })).toBeNull();
  });

  /**
   * force is for the calendar, not for the records: ending early is a school's
   * business, promoting a child nobody decided about is not.
   */
  it("cannot be forced past an undecided child", () => {
    const undecided = rolloverPlan([{ kidId: "x" }]);
    expect(closeYearProblem({ ...base, plan: undecided, force: true })).toBe("undecided");
  });

  it("has an Arabic message for every refusal", () => {
    for (const k of ["not-active", "nothing-to-close", "undecided", "too-early"] as const) {
      expect(CLOSE_YEAR_MESSAGES[k].length).toBeGreaterThan(5);
    }
  });
});

describe("nextClassGrade", () => {
  it("moves a class up one grade", () => {
    expect(nextClassGrade(7)).toBe(8);
  });

  it("retires the final-grade class", () => {
    expect(nextClassGrade(LAST_GRADE)).toBeNull();
  });

  it("says nothing for a class with no grade on file", () => {
    expect(nextClassGrade(undefined)).toBeNull();
    expect(nextClassGrade(0)).toBeNull();
  });
});
