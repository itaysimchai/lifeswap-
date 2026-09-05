"use client";

import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Service } from "@/lib/types";
import { byCreatedAtDesc, useCollectionData } from "./useCollectionData";

/** All active services, for the browse / dashboard page. */
export function useServices() {
  return useCollectionData<Service>(
    () => query(collection(db, "services"), where("status", "==", "active")),
    [],
    byCreatedAtDesc
  );
}

/** The signed-in provider's own services (any status). */
export function useMyServices(uid: string | undefined) {
  return useCollectionData<Service>(
    () =>
      uid
        ? query(collection(db, "services"), where("providerId", "==", uid))
        : null,
    [uid],
    byCreatedAtDesc
  );
}
