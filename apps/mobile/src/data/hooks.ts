import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { paths, type Alert, type Kid } from "@akbadna/core";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { DEMO_KIDS } from "./demo";

type Feed<T> = { data: T[]; loading: boolean; isDemo: boolean };

/** Kids the signed-in user guards. Falls back to demo data when none exist yet. */
export function useKids(): Feed<Kid> {
  const { user } = useAuth();
  const [state, setState] = useState<Feed<Kid>>({ data: DEMO_KIDS, loading: true, isDemo: true });

  useEffect(() => {
    if (!user) {
      // demo session or signed out — just show sample data
      setState({ data: DEMO_KIDS, loading: false, isDemo: true });
      return;
    }
    const q = query(
      collection(db, paths.kids()),
      where("guardianUids", "array-contains", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setState({ data: DEMO_KIDS, loading: false, isDemo: true });
          return;
        }
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kid),
          loading: false,
          isDemo: false,
        });
      },
      () => setState({ data: DEMO_KIDS, loading: false, isDemo: true }),
    );
    return unsub;
  }, [user]);

  return state;
}

/** Open alerts for the user's kids. */
export function useAlerts(kidIds: string[]): Feed<Alert> {
  const [state, setState] = useState<Feed<Alert>>({ data: [], loading: true, isDemo: false });
  const key = kidIds.slice(0, 10).join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      setState({ data: [], loading: false, isDemo: false });
      return;
    }
    const q = query(
      collection(db, paths.alerts()),
      where("kidId", "in", ids),
      where("state", "in", ["open", "acknowledged"]),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Alert),
          loading: false,
          isDemo: false,
        });
      },
      () => setState({ data: [], loading: false, isDemo: false }),
    );
    return unsub;
  }, [key]);

  return state;
}
