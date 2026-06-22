"use client";

import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookedSlot } from "@/lib/types";
import { useCollectionData } from "./useCollectionData";

/** Live taken slots for a service, used to hide overlapping times when booking. */
export function useBookedSlots(serviceId: string | undefined) {
  return useCollectionData<BookedSlot>(
    () =>
      serviceId
        ? query(collection(db, "bookedSlots"), where("serviceId", "==", serviceId))
        : null,
    [serviceId]
  );
}
