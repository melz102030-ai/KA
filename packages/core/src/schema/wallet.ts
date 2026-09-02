import { z } from "zod";
import { Audit, EpochMillis, Money } from "../common.js";
import { WalletTxKind } from "../enums.js";

/** walletAccounts/{kidId} — one spending account per kid. */
export const WalletAccount = Audit.extend({
  kidId: z.string().min(1),
  ownerUid: z.string().min(1), // funding guardian
  balance: Money,
  /** Daily spend cap; null = no cap. */
  dailyLimit: Money.nullable().default(null),
  frozen: z.boolean().default(false),
});
export type WalletAccount = z.infer<typeof WalletAccount>;

/** walletAccounts/{kidId}/transactions/{txId} — append-only ledger. */
export const WalletTransaction = z.object({
  id: z.string().min(1),
  kidId: z.string().min(1),
  kind: WalletTxKind,
  amount: Money, // signed: negative = debit
  balanceAfter: Money,
  label: z.string().min(1),
  at: EpochMillis,
  /** e.g. canteen POS id, top-up payment ref, reward id. */
  ref: z.string().optional(),
  createdBy: z.string().optional(),
});
export type WalletTransaction = z.infer<typeof WalletTransaction>;
