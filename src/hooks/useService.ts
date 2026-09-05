"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Service } from "@/lib/types";

/** Live single service by id (or null if it doesn't exist). */
export function useService(id: string | undefined) {
  const [data, setData] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "services", id),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as Service) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [id]);

  return { data, loading };
}
