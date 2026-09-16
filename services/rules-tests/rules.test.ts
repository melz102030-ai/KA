import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "akbadna-rules-test",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const asUser = (uid: string) => env.authenticatedContext(uid).firestore();
const asGuest = () => env.unauthenticatedContext().firestore();

describe("users", () => {
  it("a user may write only their own profile", async () => {
    await assertSucceeds(setDoc(doc(asUser("u1"), "users/u1"), { displayName: "A" }));
    await assertFails(setDoc(doc(asUser("u1"), "users/u2"), { displayName: "B" }));
  });
  it("guests are denied", async () => {
    await assertFails(getDoc(doc(asGuest(), "users/u1")));
  });
});

describe("kids", () => {
  it("a guardian creates a kid with themselves listed", async () => {
    await assertSucceeds(
      setDoc(doc(asUser("p1"), "kids/k1"), {
        name: "Kid",
        guardianUids: ["p1"],
        akbadnaId: "AKB-2345-6789",
      }),
    );
  });
  it("cannot create a kid guarded by someone else", async () => {
    await assertFails(
      setDoc(doc(asUser("p1"), "kids/k2"), {
        name: "Kid",
        guardianUids: ["p2"],
        akbadnaId: "AKB-2345-6789",
      }),
    );
  });
  it("a guardian cannot forge the live block", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "kids/k3"), {
        name: "Kid",
        guardianUids: ["p1"],
        akbadnaId: "AKB-2345-6789",
        live: { presence: "home", watchOnline: false },
      });
    });
    await assertFails(
      setDoc(
        doc(asUser("p1"), "kids/k3"),
        { live: { presence: "in_class", watchOnline: true } },
        { merge: true },
      ),
    );
  });
});

describe("memberships", () => {
  /** A school with s1_admin at its head, and a live teacher code for it. */
  const seedSchool = () =>
    env.withSecurityRulesDisabled(async (ctx) => {
      const d = ctx.firestore();
      await setDoc(doc(d, "schools/s1"), { name: "مدرسة", adminUids: ["s1_admin"] });
      await setDoc(doc(d, "joinCodes/TEACH1"), {
        code: "TEACH1",
        schoolId: "s1",
        role: "teacher",
        createdByUid: "s1_admin",
        uses: 0,
      });
      await setDoc(doc(d, "joinCodes/PAR111"), {
        code: "PAR111",
        schoolId: "s1",
        role: "parent",
        createdByUid: "s1_admin",
        uses: 0,
      });
    });

  it("a user creates only their own membership row", async () => {
    await assertSucceeds(
      setDoc(doc(asUser("u1"), "memberships/u1_s1_parent"), {
        uid: "u1",
        schoolId: "s1",
        role: "parent",
      }),
    );
    await assertFails(
      setDoc(doc(asUser("u1"), "memberships/u2_s1_parent"), {
        uid: "u2",
        schoolId: "s1",
        role: "parent",
      }),
    );
  });

  /**
   * The hole this closes: before, any signed-in user could write themselves a
   * teacher row at any school and inherit a teacher's reach over its children.
   */
  it("refuses a teacher row that no code granted", async () => {
    await seedSchool();
    await assertFails(
      setDoc(doc(asUser("stranger"), "memberships/stranger_s1_teacher"), {
        uid: "stranger",
        schoolId: "s1",
        role: "teacher",
      }),
    );
  });

  it("accepts a teacher row backed by a live teacher code", async () => {
    await seedSchool();
    await assertSucceeds(
      setDoc(doc(asUser("t9"), "memberships/t9_s1_teacher"), {
        uid: "t9",
        schoolId: "s1",
        role: "teacher",
        viaCode: "TEACH1",
      }),
    );
  });

  it("refuses a parent code used to buy a teacher row", async () => {
    await seedSchool();
    await assertFails(
      setDoc(doc(asUser("p9"), "memberships/p9_s1_teacher"), {
        uid: "p9",
        schoolId: "s1",
        role: "teacher",
        viaCode: "PAR111",
      }),
    );
  });

  it("refuses another school's code", async () => {
    await seedSchool();
    await assertFails(
      setDoc(doc(asUser("t8"), "memberships/t8_s2_teacher"), {
        uid: "t8",
        schoolId: "s2",
        role: "teacher",
        viaCode: "TEACH1",
      }),
    );
  });

  it("refuses a code that does not exist", async () => {
    await seedSchool();
    await assertFails(
      setDoc(doc(asUser("t7"), "memberships/t7_s1_teacher"), {
        uid: "t7",
        schoolId: "s1",
        role: "teacher",
        viaCode: "MADEUP",
      }),
    );
  });

  /**
   * The real onboarding sequence, in the order the app performs it: the school
   * doc first, then the founder's own staff rows. They cannot share a batch —
   * rules judge a batch against the state before it, so the school would not yet
   * exist when the membership is checked.
   */
  it("accepts the founder's staff rows written after the school", async () => {
    const d = asUser("founder");
    await assertSucceeds(
      setDoc(doc(d, "schools/new1"), { name: "مدرسة جديدة", adminUids: ["founder"] }),
    );
    await assertSucceeds(
      setDoc(doc(d, "memberships/founder_new1_teacher"), {
        uid: "founder",
        schoolId: "new1",
        role: "teacher",
      }),
    );
  });

  it("refuses a staff row for a school that does not exist", async () => {
    await assertFails(
      setDoc(doc(asUser("ghost"), "memberships/ghost_nowhere_teacher"), {
        uid: "ghost",
        schoolId: "nowhere",
        role: "teacher",
      }),
    );
  });

  it("lets the school's own founder take an admin row without a code", async () => {
    await seedSchool();
    await assertSucceeds(
      setDoc(doc(asUser("s1_admin"), "memberships/s1_admin_s1_school_admin"), {
        uid: "s1_admin",
        schoolId: "s1",
        role: "school_admin",
      }),
    );
  });

  // Creating a parent row and then editing it into a teacher row is the same
  // attack by another door.
  it("cannot be promoted into a staff role by an update", async () => {
    await seedSchool();
    await assertSucceeds(
      setDoc(doc(asUser("u5"), "memberships/u5_s1_parent"), {
        uid: "u5",
        schoolId: "s1",
        role: "parent",
      }),
    );
    await assertFails(
      setDoc(doc(asUser("u5"), "memberships/u5_s1_parent"), { role: "teacher" }, { merge: true }),
    );
  });
});

describe("academic years", () => {
  const seed = () =>
    env.withSecurityRulesDisabled(async (ctx) => {
      const d = ctx.firestore();
      await setDoc(doc(d, "schools/s1"), { name: "مدرسة", adminUids: ["s1_admin"] });
      await setDoc(doc(d, "memberships/t1_s1_teacher"), {
        uid: "t1",
        schoolId: "s1",
        role: "teacher",
      });
    });

  it("the school's staff close the year", async () => {
    await seed();
    await assertSucceeds(
      setDoc(doc(asUser("t1"), "schools/s1/years/1447"), { id: "1447", status: "active" }),
    );
    await assertSucceeds(
      setDoc(doc(asUser("t1"), "schools/s1/years/1447/enrolments/k1"), {
        kidId: "k1",
        grade: 5,
        status: "active",
      }),
    );
  });

  /** A parent must not be able to promote their own child. */
  it("a parent may read the record but never write it", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "schools/s1/years/1447/enrolments/k1"), {
        kidId: "k1",
        grade: 5,
      });
    });
    await assertSucceeds(getDoc(doc(asUser("p1"), "schools/s1/years/1447/enrolments/k1")));
    await assertFails(
      setDoc(
        doc(asUser("p1"), "schools/s1/years/1447/enrolments/k1"),
        { grade: 12 },
        { merge: true },
      ),
    );
  });

  it("staff at another school are outsiders here", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "memberships/t2_s2_teacher"), {
        uid: "t2",
        schoolId: "s2",
        role: "teacher",
      });
    });
    await assertFails(
      setDoc(doc(asUser("t2"), "schools/s1/years/1447"), { id: "1447", status: "archived" }),
    );
  });
});

describe("joinCodes", () => {
  it("creator writes the code; others may only bump the usage counter", async () => {
    await assertSucceeds(
      setDoc(doc(asUser("t1"), "joinCodes/ABC234"), {
        code: "ABC234",
        schoolId: "s1",
        role: "parent",
        createdByUid: "t1",
        uses: 0,
      }),
    );
    await assertFails(
      setDoc(doc(asUser("p1"), "joinCodes/XYZ234"), {
        code: "XYZ234",
        schoolId: "s1",
        role: "parent",
        createdByUid: "p1_wrong" /* not the caller */,
        uses: 0,
      }),
    );
    await assertSucceeds(
      setDoc(doc(asUser("p1"), "joinCodes/ABC234"), { uses: 1, updatedAt: 1 }, { merge: true }),
    );
    await assertFails(
      setDoc(doc(asUser("p1"), "joinCodes/ABC234"), { schoolId: "hijacked" }, { merge: true }),
    );
  });
});

describe("threads", () => {
  it("only participants read/write", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "threads/t1"), { participantUids: ["a", "b"] });
    });
    await assertSucceeds(getDoc(doc(asUser("a"), "threads/t1")));
    await assertFails(getDoc(doc(asUser("c"), "threads/t1")));
    await assertSucceeds(
      setDoc(doc(asUser("a"), "threads/t1/messages/m1"), { senderUid: "a", text: "hi" }),
    );
    await assertFails(
      setDoc(doc(asUser("c"), "threads/t1/messages/m2"), { senderUid: "c", text: "hi" }),
    );
  });
});

describe("wallet", () => {
  it("only a guardian tops up their kid's wallet", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "kids/k1"), {
        name: "K",
        guardianUids: ["p1"],
        akbadnaId: "AKB-2345-6789",
      });
    });
    await assertSucceeds(
      setDoc(doc(asUser("p1"), "walletAccounts/k1"), {
        kidId: "k1",
        ownerUid: "p1",
        balance: { amount: 1000, currency: "SAR" },
      }),
    );
    await assertFails(
      setDoc(doc(asUser("p2"), "walletAccounts/k1"), {
        kidId: "k1",
        ownerUid: "p2",
        balance: { amount: 1000, currency: "SAR" },
      }),
    );
  });
});

describe("watch cues", () => {
  // w1 is paired to k1 (guarded by p1, in class c1 taught by t1).
  // w9 is paired to k9, a child p1 has nothing to do with.
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const d = ctx.firestore();
      await setDoc(doc(d, "kids/k1"), {
        name: "K1",
        guardianUids: ["p1"],
        schoolId: "sc1",
        classId: "c1",
        watchId: "w1",
        akbadnaId: "AKB-2345-6789",
      });
      await setDoc(doc(d, "kids/k9"), {
        name: "K9",
        guardianUids: ["p9"],
        schoolId: "sc1",
        classId: "c9",
        watchId: "w9",
        akbadnaId: "AKB-3456-7890",
      });
      await setDoc(doc(d, "schools/sc1/classes/c1"), { name: "C1", teacherIds: ["t1"] });
      await setDoc(doc(d, "schools/sc1/classes/c9"), { name: "C9", teacherIds: ["t9"] });
      await setDoc(doc(d, "watches/w1"), { kidId: "k1", imei: "111111111111111" });
      await setDoc(doc(d, "watches/w9"), { kidId: "k9", imei: "999999999999999" });
    });
  });

  const cue = (kidId: string, watchId: string) => ({
    watchId,
    kidId,
    cue: "praise",
    text: "أحسنت",
    startedAt: Date.now(),
    origin: "attendance",
    status: "queued",
  });

  it("the class teacher may cue a student's watch", async () => {
    await assertSucceeds(setDoc(doc(asUser("t1"), "watches/w1/commands/x1"), cue("k1", "w1")));
  });

  it("a guardian may cue their own kid's watch", async () => {
    await assertSucceeds(setDoc(doc(asUser("p1"), "watches/w1/commands/x2"), cue("k1", "w1")));
  });

  it("a teacher of another class may not", async () => {
    await assertFails(setDoc(doc(asUser("t9"), "watches/w1/commands/x3"), cue("k1", "w1")));
  });

  it("a stranger may not", async () => {
    await assertFails(setDoc(doc(asGuest(), "watches/w1/commands/x4"), cue("k1", "w1")));
  });

  // The case the watchBelongsToKid check exists for: p1 is allowed to write
  // cues for k1, and tries to land one on a different child's device.
  it("cannot aim another child's watch by naming their own kid", async () => {
    await assertFails(setDoc(doc(asUser("p1"), "watches/w9/commands/x5"), cue("k1", "w9")));
  });

  it("cannot pre-mark a cue as already seen", async () => {
    await assertFails(
      setDoc(doc(asUser("t1"), "watches/w1/commands/x6"), {
        ...cue("k1", "w1"),
        status: "acked",
        ackedAt: Date.now(),
      }),
    );
  });
});
