"use client";

import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ServiceRequest } from "@/lib/types";
import { byCreatedAtDesc, useCollectionData } from "./useCollectionData";

/** Requests other users made for the signed-in provider's services. */
export function useIncomingRequests(uid: string | undefined) {
  return useCollectionData<ServiceRequest>(
    () =>
      uid
        ? query(
            collection(db, "serviceRequests"),
            where("providerId", "==", uid)
          )
        : null,
    [uid],
    byCreatedAtDesc
  );
}

/** Requests the signed-in user has made for other people's services. */
export function useOutgoingRequests(uid: string | undefined) {
  return useCollectionData<ServiceRequest>(
    () =>
      uid
        ? query(
            collection(db, "serviceRequests"),
            where("requesterId", "==", uid)
          )
        : null,
    [uid],
    byCreatedAtDesc
  );
}
