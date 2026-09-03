import { FieldValue } from "firebase-admin/firestore";
import { paths } from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { defineCallable, HttpsError } from "../lib/callable.js";

/** Top up a kid's wallet. Payment is mocked — record a credit + ledger entry. */
export const topUpWallet = defineCallable("topUpWallet", async (input, { uid }) => {
  const kid = await db.doc(paths.kid(input.kidId)).get();
  if (!kid.exists) throw new HttpsError("not-found", "الطفل غير موجود");
  if (!(kid.get("guardianUids") as string[]).includes(uid)) {
    throw new HttpsError("permission-denied", "لست ولي أمر هذا الطفل");
  }

  const acctRef = db.doc(paths.walletAccount(input.kidId));
  const balanceHalalas = await db.runTransaction(async (tx) => {
    const acct = await tx.get(acctRef);
    const prev = (acct.get("balance")?.amount as number | undefined) ?? 0;
    const next = prev + input.amountHalalas;
    tx.set(
      acctRef,
      {
        kidId: input.kidId,
        ownerUid: uid,
        balance: { amount: next, currency: "SAR" },
        frozen: false,
        updatedAt: now(),
        createdAt: acct.exists ? acct.get("createdAt") : now(),
      },
      { merge: true },
    );
    const txRef = db.collection(paths.walletTransactions(input.kidId)).doc();
    tx.set(txRef, {
      id: txRef.id,
      kidId: input.kidId,
      kind: "topup",
      amount: { amount: input.amountHalalas, currency: "SAR" },
      balanceAfter: { amount: next, currency: "SAR" },
      label: "شحن رصيد",
      at: now(),
      createdBy: uid,
    });
    return next;
  });

  void FieldValue;
  return { balanceHalalas };
});
