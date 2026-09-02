// ─── Firestore data layer ────────────────────────────────────────────────────
// Live collection hooks with one-time seeding. Each hook subscribes to a
// collection and, if it is empty on first read, writes the seed documents so
// the app has data to show. Components keep using plain arrays.
import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { KIDS_SEED, MESSAGES_SEED } from "./seed.js";

async function seedIfEmpty(colName, seedRows) {
  const snap = await getDocs(collection(db, colName));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  seedRows.forEach((row) => {
    const { id, ...rest } = row;
    batch.set(doc(db, colName, String(id)), rest);
  });
  await batch.commit();
}

/**
 * Subscribe to a Firestore collection.
 * @param {string} colName
 * @param {Array}  seedRows  written once if the collection is empty
 * @param {string} [orderField] optional field to order by
 * @returns {{ rows: Array, loading: boolean, error: Error|null }}
 */
export function useCollection(colName, seedRows, orderField) {
  const [rows, setRows] = useState(seedRows ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seeded = useRef(false);

  useEffect(() => {
    const base = collection(db, colName);
    const q = orderField ? query(base, orderBy(orderField)) : base;

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty && !seeded.current && seedRows?.length) {
          seeded.current = true;
          seedIfEmpty(colName, seedRows).catch((e) => setError(e));
          return; // the snapshot listener fires again once docs land
        }
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        setError(e);
        setLoading(false);
      }
    );
    return unsub;
  }, [colName, orderField]); // eslint-disable-line react-hooks/exhaustive-deps

  return { rows, loading, error };
}

export const useKids = () => useCollection("kids", KIDS_SEED);
export const useMessages = () => useCollection("messages", MESSAGES_SEED, "order");
