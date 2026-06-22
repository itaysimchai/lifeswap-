"use client";

import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Report } from "@/lib/types";
import { byCreatedAtDesc, useCollectionData } from "./useCollectionData";

/** All abuse reports — admin review queue. */
export function useReports() {
  return useCollectionData<Report>(
    () => collection(db, "reports"),
    [],
    byCreatedAtDesc
  );
}
