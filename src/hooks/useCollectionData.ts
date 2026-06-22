"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  type DocumentData,
  type Query,
} from "firebase/firestore";

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Generic real-time list subscription. Pass a factory that builds the query
 * (or returns `null` to stay idle, e.g. before the uid is known). An optional
 * client-side comparator keeps us off composite Firestore indexes — we filter
 * with `where(...)` in the query and sort here instead.
 */
export function useCollectionData<T>(
  buildQuery: () => Query<DocumentData> | null,
  deps: unknown[],
  sortFn?: (a: T, b: T) => number
): CollectionState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = buildQuery();
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
        setData(sortFn ? [...rows].sort(sortFn) : rows);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

/** Newest-first comparator for any doc carrying a `createdAt` Timestamp. */
export function byCreatedAtDesc(
  a: { createdAt?: { toMillis(): number } | null },
  b: { createdAt?: { toMillis(): number } | null }
): number {
  return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
}
