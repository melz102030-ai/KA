import { describe, expect, it } from "vitest";
import {
  canApproveEnrolment,
  canInvite,
  canVerifySchool,
  enrolmentIsActive,
  enrolmentIsClosed,
  membershipIsActive,
  redemptionProblem,
  schoolCapabilities,
  type Redemption,
} from "../trust.js";

describe("canInvite — the chain only runs downwards", () => {
  it("a school admin brings in teachers and families", () => {
    expect(canInvite("school_admin", "teacher")).toBe(true);
    expect(canInvite("school_admin", "parent")).toBe(true);
  });

  it("a teacher brings in the families of their class, and no one else", () => {
    expect(canInvite("teacher", "parent")).toBe(true);
    expect(canInvite("teacher", "teacher")).toBe(false);
  });

  // The loop that would cost a school control of its own staff.
  it("a teacher cannot mint another teacher", () => {
    expect(canInvite("teacher", "teacher")).toBe(false);
  });

  it("a parent vouches for nobody", () => {
    for (const r of ["parent", "teacher", "school_admin", "driver"] as const) {
      expect(canInvite("parent", r)).toBe(false);
    }
  });

  it("nobody mints a school admin — only the operator does that", () => {
    for (const r of ["parent", "teacher", "school_admin", "driver"] as const) {
      expect(canInvite(r, "school_admin")).toBe(false);
    }
  });
});

describe("who admits a child, and who verifies a school", () => {
  it("only the school side admits a child to a class", () => {
    expect(canApproveEnrolment("teacher")).toBe(true);
    expect(canApproveEnrolment("school_admin")).toBe(true);
    expect(canApproveEnrolment("parent")).toBe(false);
    expect(canApproveEnrolment("driver")).toBe(false);
  });

  it("a teacher cannot verify their own school", () => {
    expect(canVerifySchool("teacher")).toBe(false);
    expect(canVerifySchool("parent")).toBe(false);
    expect(canVerifySchool("school_admin")).toBe(true);
  });
});

describe("redemptionProblem", () => {
  const base: Redemption = {
    codeRole: "parent",
    asRole: "parent",
    uses: 0,
    now: 1_800_000_000_000,
  };

  it("lets a matching, live code through", () => {
    expect(redemptionProblem(base)).toBeNull();
  });

  /**
   * The hole this function exists to close: a caller that trusts the redeemer's
   * claimed role hands anyone holding a parent code a teacher's access.
   */
  it("refuses a parent code redeemed as a teacher", () => {
    expect(redemptionProblem({ ...base, codeRole: "parent", asRole: "teacher" })).toBe(
      "role-mismatch",
    );
  });

  it("refuses a teacher code redeemed as a parent", () => {
    expect(redemptionProblem({ ...base, codeRole: "teacher", asRole: "parent" })).toBe(
      "role-mismatch",
    );
  });

  it("checks the role before anything else, so a mismatch is never masked", () => {
    const stale = {
      ...base,
      codeRole: "parent" as const,
      asRole: "teacher" as const,
      expiresAt: base.now - 1,
    };
    expect(redemptionProblem(stale)).toBe("role-mismatch");
  });

  it("refuses an expired code", () => {
    expect(redemptionProblem({ ...base, expiresAt: base.now - 1 })).toBe("expired");
    expect(redemptionProblem({ ...base, expiresAt: base.now + 1 })).toBeNull();
  });

  it("refuses a code that has been used up", () => {
    expect(redemptionProblem({ ...base, uses: 3, maxUses: 3 })).toBe("exhausted");
    expect(redemptionProblem({ ...base, uses: 2, maxUses: 3 })).toBeNull();
  });

  it("treats a code with no limits as open", () => {
    expect(redemptionProblem({ ...base, uses: 9999 })).toBeNull();
  });

  it("refuses any code for a suspended school", () => {
    expect(redemptionProblem({ ...base, schoolStatus: "suspended" })).toBe("school-suspended");
    expect(redemptionProblem({ ...base, schoolStatus: "pending" })).toBeNull();
  });
});

describe("schoolCapabilities", () => {
  // A real class should not wait on paperwork to take the register.
  it("lets an unverified school run, but not grow", () => {
    const c = schoolCapabilities("pending");
    expect(c.canOperate).toBe(true);
    expect(c.canRecruit).toBe(false);
    expect(c.notice).toBeTruthy();
  });

  it("gives a verified school everything and says nothing", () => {
    const c = schoolCapabilities("verified");
    expect(c.canOperate).toBe(true);
    expect(c.canRecruit).toBe(true);
    expect(c.notice).toBeNull();
  });

  it("stops a suspended school entirely", () => {
    const c = schoolCapabilities("suspended");
    expect(c.canOperate).toBe(false);
    expect(c.canRecruit).toBe(false);
  });
});

describe("status helpers", () => {
  it("only an active membership grants anything", () => {
    expect(membershipIsActive("active")).toBe(true);
    for (const s of ["invited", "rejected", "removed"] as const) {
      expect(membershipIsActive(s)).toBe(false);
    }
  });

  it("only an active enrolment puts a child in the class", () => {
    expect(enrolmentIsActive("active")).toBe(true);
    for (const s of ["pending", "rejected", "transferred", "graduated"] as const) {
      expect(enrolmentIsActive(s)).toBe(false);
    }
  });

  // Gone from the class, still on file — the difference that lets a school keep
  // its history instead of deleting children out of it.
  it("separates 'gone' from 'not yet in'", () => {
    expect(enrolmentIsClosed("graduated")).toBe(true);
    expect(enrolmentIsClosed("transferred")).toBe(true);
    expect(enrolmentIsClosed("rejected")).toBe(true);
    expect(enrolmentIsClosed("pending")).toBe(false);
    expect(enrolmentIsClosed("active")).toBe(false);
  });
});
