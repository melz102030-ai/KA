import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export const messaging = getMessaging();

/** Firestore Timestamp -> epoch millis, tolerant of already-numeric input. */
export const millis = (v: unknown): number =>
  typeof v === "number"
    ? v
    : v && typeof (v as { toMillis?: () => number }).toMillis === "function"
      ? (v as { toMillis: () => number }).toMillis()
      : Date.now();

export const now = () => Date.now();
