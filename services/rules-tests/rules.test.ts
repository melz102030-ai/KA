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
