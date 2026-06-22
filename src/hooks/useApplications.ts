"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Application } from "@/lib/types";
import { byCreatedAtDesc, useCollectionData } from "./useCollectionData";

/** Every provider application — admin approval queue. */
export function useApplications() {
  return useCollectionData<Application>(
    () => collection(db, "applications"),
    [],
    byCreatedAtDesc
  );
}

/** The signed-in user's own application doc (or null if they haven't applied). */
export function useMyApplication(uid: string | undefined) {
  const [data, setData] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "applications", uid),
      (snap) => {
        setData(snap.exists() ? ({ uid, ...snap.data() } as Application) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  return { data, loading };
}
