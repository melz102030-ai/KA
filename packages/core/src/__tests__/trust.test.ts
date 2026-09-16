import { describe, expect, it } from "vitest";
import {
  EVIDENCE_MESSAGES,
  canApproveEnrolment,
  canInvite,
  canSetSchoolStatus,
  evidenceIsComplete,
  evidenceProblems,
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
    // Verification is not a power any role carries; see canSetSchoolStatus.
    expect(
      canSetSchoolStatus({
        from: "submitted",
        to: "verified",
        isOperator: false,
        isSchoolAdmin: true,
      }),
    ).toBe(false);
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
    expect(redemptionProblem({ ...base, schoolStatus: "suspended" })).toBe("school-inactive");
    // A code for a school that has not been verified leads nowhere either.
    expect(redemptionProblem({ ...base, schoolStatus: "pending" })).toBe("school-inactive");
    expect(redemptionProblem({ ...base, schoolStatus: "verified" })).toBeNull();
  });
});

describe("schoolCapabilities", () => {
  /**
   * The policy this app chose: an unverified school does not run at all.
   * It costs a real school its first days, and it is the reason nobody can
   * raise a school out of thin air and start gathering other people's children
   * into it.
   */
  it("stops an unverified school entirely, and tells it whose move it is", () => {
    const c = schoolCapabilities("pending");
    expect(c.canOperate).toBe(false);
    expect(c.canRecruit).toBe(false);
    expect(c.canSubmit).toBe(true);
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

describe("school capabilities", () => {
  it("lets nothing run until the school is verified", () => {
    for (const s of ["pending", "submitted", "rejected", "suspended"] as const) {
      expect(schoolCapabilities(s).canOperate).toBe(false);
      expect(schoolCapabilities(s).canRecruit).toBe(false);
    }
    expect(schoolCapabilities("verified").canOperate).toBe(true);
    expect(schoolCapabilities("verified").canRecruit).toBe(true);
  });

  /** The school must always be able to tell whose move it is. */
  it("offers the form only when the school is the one holding things up", () => {
    expect(schoolCapabilities("pending").canSubmit).toBe(true);
    expect(schoolCapabilities("rejected").canSubmit).toBe(true);
    expect(schoolCapabilities("submitted").canSubmit).toBe(false);
    expect(schoolCapabilities("suspended").canSubmit).toBe(false);
  });

  it("says something useful in every state but the verified one", () => {
    expect(schoolCapabilities("verified").notice).toBeNull();
    for (const s of ["pending", "submitted", "rejected", "suspended"] as const) {
      expect(schoolCapabilities(s).notice!.length).toBeGreaterThan(10);
    }
  });
});

describe("evidenceProblems", () => {
  const good = {
    name: "متوسطة النور",
    licenceNo: "123456",
    headTeacherName: "سعد بن محمد الحربي",
    headTeacherNationalId: "1999999996",
    phone: "+966112345678",
    location: { lat: 24.7, lng: 46.7 },
  };

  it("passes a complete file", () => {
    expect(evidenceProblems(good)).toEqual([]);
    expect(evidenceIsComplete(good)).toBe(true);
  });

  it("reports every missing field at once, not one at a time", () => {
    expect(evidenceProblems({}).length).toBe(6);
  });

  it("checks the head teacher's id by its checksum", () => {
    expect(evidenceProblems({ ...good, headTeacherNationalId: "1999999999" })).toContain(
      "bad-head-id",
    );
  });

  it("takes a school landline as readily as a mobile", () => {
    expect(evidenceProblems({ ...good, phone: "+966112345678" })).toEqual([]);
    expect(evidenceProblems({ ...good, phone: "+966512345678" })).toEqual([]);
    expect(evidenceProblems({ ...good, phone: "0112345678" })).toContain("bad-phone");
    expect(evidenceProblems({ ...good, phone: "+971512345678" })).toContain("bad-phone");
  });

  it("refuses a licence number with letters or punctuation", () => {
    expect(evidenceProblems({ ...good, licenceNo: "12-34" })).toContain("bad-licence");
    expect(evidenceProblems({ ...good, licenceNo: "AB123" })).toContain("bad-licence");
    expect(evidenceProblems({ ...good, licenceNo: "12" })).toContain("bad-licence");
  });

  it("insists on a location, since it is the one thing that cannot be typed from a sofa", () => {
    expect(evidenceProblems({ ...good, location: undefined })).toContain("no-location");
  });

  it("has an Arabic message for every problem it can report", () => {
    for (const p of evidenceProblems({})) expect(EVIDENCE_MESSAGES[p].length).toBeGreaterThan(5);
  });
});

describe("canSetSchoolStatus", () => {
  const admin = { isOperator: false, isSchoolAdmin: true, evidenceComplete: true };

  it("lets a school hand in a complete file for review", () => {
    expect(canSetSchoolStatus({ from: "pending", to: "submitted", ...admin })).toBe(true);
    expect(canSetSchoolStatus({ from: "rejected", to: "submitted", ...admin })).toBe(true);
  });

  it("refuses an incomplete file", () => {
    expect(
      canSetSchoolStatus({ from: "pending", to: "submitted", ...admin, evidenceComplete: false }),
    ).toBe(false);
  });

  /**
   * The rule the chain rests on: the school's own admin cannot stamp their
   * school as verified, which is precisely what the app allowed before.
   */
  it("never lets a school verify itself", () => {
    expect(canSetSchoolStatus({ from: "pending", to: "verified", ...admin })).toBe(false);
    expect(canSetSchoolStatus({ from: "submitted", to: "verified", ...admin })).toBe(false);
  });

  it("never lets a school lift its own suspension", () => {
    expect(canSetSchoolStatus({ from: "suspended", to: "verified", ...admin })).toBe(false);
    expect(canSetSchoolStatus({ from: "suspended", to: "submitted", ...admin })).toBe(false);
  });

  it("lets the operator decide either way, and withdraw a verification", () => {
    const op = { isOperator: true, isSchoolAdmin: false };
    expect(canSetSchoolStatus({ from: "submitted", to: "verified", ...op })).toBe(true);
    expect(canSetSchoolStatus({ from: "submitted", to: "rejected", ...op })).toBe(true);
    expect(canSetSchoolStatus({ from: "verified", to: "suspended", ...op })).toBe(true);
  });

  it("is not a licence for a no-op write", () => {
    expect(
      canSetSchoolStatus({
        from: "verified",
        to: "verified",
        isOperator: true,
        isSchoolAdmin: false,
      }),
    ).toBe(false);
  });

  it("refuses a stranger outright", () => {
    expect(
      canSetSchoolStatus({
        from: "submitted",
        to: "verified",
        isOperator: false,
        isSchoolAdmin: false,
      }),
    ).toBe(false);
  });
});
