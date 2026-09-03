import { doc, onSnapshot, type DocumentData, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { db } from "@/lib/firebase";

export type Feed<T> = { data: T[]; loading: boolean; error: string | null };
export type One<T> = { data: T | null; loading: boolean; error: string | null };

/** Firestore Timestamps -> epoch millis so zod schemas parse cleanly. */
function normalise(v: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [k, val] of Object.entries(v)) {
    if (val && typeof (val as { toMillis?: () => number }).toMillis === "function") {
      out[k] = (val as { toMillis: () => number }).toMillis();
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      out[k] = normalise(val as DocumentData);
    } else {
      out[k] = val;
    }
  }
  return out;
}

/**
 * Live collection query, validated per-doc with a zod schema (invalid docs skipped).
 * `key` is the stable identity of the query; `build` returns the Query (or null to idle).
 */
export function useLiveQuery<S extends z.ZodTypeAny>(
  key: string | null,
  schema: S,
  build: () => Query | null,
): Feed<z.infer<S>> {
  const [state, setState] = useState<Feed<z.infer<S>>>({ data: [], loading: true, error: null });

  useEffect(() => {
    const q = key ? build() : null;
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: z.infer<S>[] = [];
        snap.forEach((d) => {
          const parsed = schema.safeParse({ id: d.id, ...normalise(d.data()) });
          if (parsed.success) rows.push(parsed.data);
        });
        setState({ data: rows, loading: false, error: null });
      },
      (e) => setState({ data: [], loading: false, error: e.message }),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

/** Live single document, validated with a zod schema. */
export function useLiveDoc<S extends z.ZodTypeAny>(
  path: string | null,
  schema: S,
): One<z.infer<S>> {
  const [state, setState] = useState<One<z.infer<S>>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const unsub = onSnapshot(
      doc(db, path),
      (snap) => {
        if (!snap.exists()) return setState({ data: null, loading: false, error: null });
        const parsed = schema.safeParse({ id: snap.id, ...normalise(snap.data()) });
        setState({
          data: parsed.success ? parsed.data : null,
          loading: false,
          error: parsed.success ? null : "بيانات غير صالحة",
        });
      },
      (e) => setState({ data: null, loading: false, error: e.message }),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}
