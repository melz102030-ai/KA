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
      setDoc(doc(asUser("p1"), "kids/k1"), { name: "Kid", guardianUids: ["p1"], akbadnaId: "AKB-2345-6789" }),
    );
  });
  it("cannot create a kid guarded by someone else", async () => {
    await assertFails(
      setDoc(doc(asUser("p1"), "kids/k2"), { name: "Kid", guardianUids: ["p2"], akbadnaId: "AKB-2345-6789" }),
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
  it("a user creates only their own membership row", async () => {
    await assertSucceeds(
      setDoc(doc(asUser("u1"), "memberships/m1"), { uid: "u1", schoolId: "s1", role: "parent" }),
    );
    await assertFails(
      setDoc(doc(asUser("u1"), "memberships/m2"), { uid: "u2", schoolId: "s1", role: "parent" }),
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
