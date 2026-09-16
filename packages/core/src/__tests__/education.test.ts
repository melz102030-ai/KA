import { describe, expect, it } from "vitest";
import {
  ALL_GRADES,
  GRADES_BY_STAGE,
  canEnrol,
  classLabel,
  gradeLabel,
  gradeWithinStage,
  groupChildren,
  segmentForGender,
  segmentsPresent,
  stageOfGrade,
  validateSchedule,
  DEFAULT_PERIODS,
} from "../education.js";

describe("stages", () => {
  it("splits the twelve grades 6 / 3 / 3", () => {
    expect(GRADES_BY_STAGE.primary).toHaveLength(6);
    expect(GRADES_BY_STAGE.intermediate).toHaveLength(3);
    expect(GRADES_BY_STAGE.secondary).toHaveLength(3);
    expect(ALL_GRADES).toHaveLength(12);
  });

  it("puts each grade in the right stage, including the boundaries", () => {
    expect(stageOfGrade(1)).toBe("primary");
    expect(stageOfGrade(6)).toBe("primary");
    expect(stageOfGrade(7)).toBe("intermediate");
    expect(stageOfGrade(9)).toBe("intermediate");
    expect(stageOfGrade(10)).toBe("secondary");
    expect(stageOfGrade(12)).toBe("secondary");
  });

  it("restarts the count inside each stage", () => {
    expect(gradeWithinStage(6)).toBe(6);
    expect(gradeWithinStage(7)).toBe(1);
    expect(gradeWithinStage(9)).toBe(3);
    expect(gradeWithinStage(10)).toBe(1);
  });
});

describe("gradeLabel", () => {
  it("names the grade the way a parent says it", () => {
    expect(gradeLabel(1)).toBe("الأول ابتدائي");
    expect(gradeLabel(6)).toBe("السادس ابتدائي");
    expect(gradeLabel(7)).toBe("الأول متوسط");
    expect(gradeLabel(10)).toBe("الأول ثانوي");
    expect(gradeLabel(12)).toBe("الثالث ثانوي");
  });

  it("is empty rather than wrong for a grade outside 1-12", () => {
    expect(gradeLabel(0)).toBe("");
    expect(gradeLabel(13)).toBe("");
    expect(gradeLabel(1.5)).toBe("");
  });

  it("appends the section when there is one", () => {
    expect(classLabel(7, "أ")).toBe("الأول متوسط - أ");
    expect(classLabel(7)).toBe("الأول متوسط");
  });
});

describe("segregation", () => {
  it("maps each child to their own segment", () => {
    expect(segmentForGender("boy")).toBe("boys");
    expect(segmentForGender("girl")).toBe("girls");
  });

  // The rule the whole module exists for.
  it("allows enrolment only in a matching school", () => {
    expect(canEnrol("boy", "boys")).toBe(true);
    expect(canEnrol("girl", "girls")).toBe(true);
    expect(canEnrol("boy", "girls")).toBe(false);
    expect(canEnrol("girl", "boys")).toBe(false);
  });
});

describe("groupChildren", () => {
  const kids = [
    { id: "a", gender: "boy" as const, grade: 8 }, // الثاني متوسط
    { id: "b", gender: "girl" as const, grade: 2 }, // الثاني ابتدائي
    { id: "c", gender: "boy" as const, grade: 3 }, // الثالث ابتدائي
    { id: "d", gender: "girl" as const, grade: 11 }, // الثاني ثانوي
    { id: "e", gender: "boy" as const, grade: 1 },
  ];

  it("buckets by segment then stage", () => {
    const { groups } = groupChildren(kids);
    expect(groups.map((g) => g.key)).toEqual([
      "boys:primary",
      "boys:intermediate",
      "girls:primary",
      "girls:secondary",
    ]);
  });

  it("labels each group in Arabic", () => {
    const { groups } = groupChildren(kids);
    expect(groups[0]!.label).toBe("ابتدائي بنين");
    expect(groups[3]!.label).toBe("ثانوي بنات");
  });

  it("sorts children inside a group by grade", () => {
    const { groups } = groupChildren(kids);
    expect(groups[0]!.children.map((c) => c.id)).toEqual(["e", "c"]);
  });

  it("skips empty buckets rather than listing them", () => {
    const { groups } = groupChildren([{ id: "x", gender: "girl" as const, grade: 4 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.key).toBe("girls:primary");
  });

  // A child whose record is half-filled must not be quietly filed under a guess.
  it("returns children with no gender or grade separately", () => {
    const { groups, unsorted } = groupChildren([
      { id: "known", gender: "boy" as const, grade: 5 },
      { id: "noGender", grade: 5 },
      { id: "noGrade", gender: "girl" as const },
      { id: "neither" },
    ]);
    expect(groups).toHaveLength(1);
    expect(unsorted.map((c) => c.id)).toEqual(["noGender", "noGrade", "neither"]);
  });

  it("keeps the order fixed no matter how the input is ordered", () => {
    const forwards = groupChildren(kids).groups.map((g) => g.key);
    const backwards = groupChildren(kids.slice().reverse()).groups.map((g) => g.key);
    expect(backwards).toEqual(forwards);
  });
});

describe("segmentsPresent", () => {
  it("reports only the sides the parent actually has children on", () => {
    expect(segmentsPresent([{ id: "a", gender: "boy" }])).toEqual(["boys"]);
    expect(segmentsPresent([{ id: "a", gender: "girl" }])).toEqual(["girls"]);
    expect(
      segmentsPresent([
        { id: "a", gender: "girl" },
        { id: "b", gender: "boy" },
      ]),
    ).toEqual(["boys", "girls"]);
  });

  it("is empty when nothing is recorded, so no filter is offered", () => {
    expect(segmentsPresent([{ id: "a" }])).toEqual([]);
  });
});

describe("validateSchedule", () => {
  const ok = [
    { name: "الأولى", start: "07:00", end: "07:45" },
    { name: "الثانية", start: "07:45", end: "08:30" },
  ];

  it("passes a sound timetable", () => {
    expect(validateSchedule(ok)).toEqual([]);
  });

  it("refuses an empty one", () => {
    expect(validateSchedule([])).toEqual([{ kind: "empty" }]);
  });

  it("catches a period that ends before it starts", () => {
    const p = validateSchedule([{ name: "الأولى", start: "08:00", end: "07:00" }]);
    expect(p).toContainEqual({ kind: "backwards", index: 0 });
  });

  it("catches a zero-length period", () => {
    const p = validateSchedule([{ name: "الأولى", start: "08:00", end: "08:00" }]);
    expect(p).toContainEqual({ kind: "backwards", index: 0 });
  });

  it("catches a malformed clock", () => {
    for (const t of ["7:00", "25:00", "07:60", "0700", ""]) {
      expect(validateSchedule([{ name: "أ", start: t, end: "09:00" }])).toContainEqual({
        kind: "bad-time",
        index: 0,
      });
    }
  });

  it("catches a period with no name", () => {
    expect(validateSchedule([{ name: "  ", start: "07:00", end: "08:00" }])).toContainEqual({
      kind: "no-name",
      index: 0,
    });
  });

  /**
   * The one that matters: currentPeriod returns the FIRST period containing the
   * moment, so an overlap makes "الحصة الحالية" depend on array order.
   */
  it("catches overlapping periods", () => {
    const p = validateSchedule([
      { name: "الأولى", start: "07:00", end: "08:00" },
      { name: "الثانية", start: "07:30", end: "08:30" },
    ]);
    expect(p).toContainEqual({ kind: "overlap", index: 1 });
  });

  it("allows periods that merely touch", () => {
    expect(validateSchedule(ok)).toEqual([]);
  });

  // A teacher who types rows out of order should be told about a real clash,
  // not about their typing order.
  it("judges overlap by the clock, not by row order", () => {
    const outOfOrder = [
      { name: "الثانية", start: "08:00", end: "09:00" },
      { name: "الأولى", start: "07:00", end: "08:00" },
    ];
    expect(validateSchedule(outOfOrder)).toEqual([]);
  });

  it("reports every problem at once, not just the first", () => {
    const messy = [
      { name: "", start: "07:00", end: "06:00" },
      { name: "ب", start: "bad", end: "09:00" },
    ];
    const p = validateSchedule(messy);
    expect(p.length).toBeGreaterThanOrEqual(3);
    expect(p).toContainEqual({ kind: "no-name", index: 0 });
    expect(p).toContainEqual({ kind: "backwards", index: 0 });
    expect(p).toContainEqual({ kind: "bad-time", index: 1 });
  });

  it("ships a default day that is itself valid", () => {
    expect(validateSchedule(DEFAULT_PERIODS)).toEqual([]);
  });
});
