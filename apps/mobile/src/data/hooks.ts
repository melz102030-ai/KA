import { useMemo } from "react";
import { collection, documentId, limit, orderBy, query, where } from "firebase/firestore";
import {
  Alert as AlertSchema,
  JoinCodeDoc,
  Kid,
  Membership,
  Message,
  SchoolClass,
  type SchedulePeriod,
  Thread,
  WalletAccount,
  WalletTransaction,
  paths,
} from "@akbadna/core";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { type Feed, type One, useLiveDoc, useLiveQuery } from "./firestore";
import { DEMO_KIDS, DEMO_MESSAGES, DEMO_SCHEDULE } from "./demo";

const demoFeed = <T>(data: T[]): Feed<T> => ({ data, loading: false, error: null });

/** Memberships of the signed-in user (drives roles + onboarding). */
export function useMemberships(): Feed<Membership> {
  const { user, isDemo } = useAuth();
  const uid = user?.uid;
  const real = useLiveQuery(!isDemo && uid ? `memberships:${uid}` : null, Membership, () =>
    query(collection(db, paths.memberships()), where("uid", "==", uid)),
  );
  return isDemo ? demoFeed([]) : real;
}

/** Kids the signed-in user guards. */
export function useKids(): Feed<Kid> & { isDemo: boolean } {
  const { user, isDemo } = useAuth();
  const uid = user?.uid;
  const real = useLiveQuery(!isDemo && uid ? `kids:${uid}` : null, Kid, () =>
    query(collection(db, paths.kids()), where("guardianUids", "array-contains", uid)),
  );
  return isDemo ? { ...demoFeed(DEMO_KIDS as Kid[]), isDemo: true } : { ...real, isDemo: false };
}

/** Account has no memberships and no kids -> route to onboarding. */
export function useNeedsOnboarding(): { needs: boolean; ready: boolean } {
  const { isDemo } = useAuth();
  const m = useMemberships();
  const k = useKids();
  if (isDemo) return { needs: false, ready: true };
  const ready = !m.loading && !k.loading;
  return { needs: ready && m.data.length === 0 && k.data.length === 0, ready };
}

export function useClass(schoolId?: string, classId?: string): One<SchoolClass> {
  return useLiveDoc(schoolId && classId ? paths.class(schoolId, classId) : null, SchoolClass);
}

/** The first join code minted for a school (teachers share it with parents). */
export function useSchoolJoinCode(schoolId?: string): string | null {
  const { data } = useLiveQuery(schoolId ? `joincode:${schoolId}` : null, JoinCodeDoc, () =>
    query(collection(db, paths.joinCodes()), where("schoolId", "==", schoolId), limit(1)),
  );
  return data[0]?.code ?? null;
}

/** Kids on a class roster (max 30 ids per query). */
export function useRoster(kidIds: string[]): Feed<Kid> {
  const { isDemo } = useAuth();
  const ids = kidIds.slice(0, 30);
  const key = !isDemo && ids.length ? `roster:${ids.join(",")}` : null;
  const real = useLiveQuery(key, Kid, () =>
    query(collection(db, paths.kids()), where(documentId(), "in", ids)),
  );
  return isDemo ? demoFeed(DEMO_KIDS as Kid[]) : real;
}

export function useThreads(): Feed<Thread> {
  const { user, isDemo } = useAuth();
  const uid = user?.uid;
  const real = useLiveQuery(!isDemo && uid ? `threads:${uid}` : null, Thread, () =>
    query(
      collection(db, paths.threads()),
      where("participantUids", "array-contains", uid),
      orderBy("updatedAt", "desc"),
      limit(50),
    ),
  );
  return isDemo ? demoFeed([]) : real;
}

export function useMessages(threadId?: string): Feed<Message> {
  const { isDemo } = useAuth();
  const key = !isDemo && threadId ? `messages:${threadId}` : null;
  const real = useLiveQuery(key, Message, () =>
    query(collection(db, paths.messages(threadId!)), orderBy("at", "asc"), limit(200)),
  );
  return isDemo ? demoFeed([]) : real;
}

export function useAlerts(kidIds: string[]): Feed<typeof AlertSchema._type> {
  const { isDemo } = useAuth();
  const ids = kidIds.slice(0, 10);
  const key = !isDemo && ids.length ? `alerts:${ids.join(",")}` : null;
  const real = useLiveQuery(key, AlertSchema, () =>
    query(
      collection(db, paths.alerts()),
      where("kidId", "in", ids),
      where("state", "in", ["open", "acknowledged"]),
    ),
  );
  return isDemo ? demoFeed([]) : real;
}

export function useWallet(kidId?: string): One<WalletAccount> {
  return useLiveDoc(kidId ? paths.walletAccount(kidId) : null, WalletAccount);
}

export function useWalletTx(kidId?: string): Feed<WalletTransaction> {
  const key = kidId ? `wallettx:${kidId}` : null;
  return useLiveQuery(key, WalletTransaction, () =>
    query(collection(db, paths.walletTransactions(kidId!)), orderBy("at", "desc"), limit(50)),
  );
}

/** Today's schedule for a class; falls back to a sample timetable. */
export function useSchedule(cls: SchoolClass | null): SchedulePeriod[] {
  return useMemo(() => {
    const wd = String(new Date().getDay());
    const fromClass = cls?.schedule?.[wd];
    return fromClass && fromClass.length ? fromClass : DEMO_SCHEDULE;
  }, [cls]);
}

export { DEMO_MESSAGES };
