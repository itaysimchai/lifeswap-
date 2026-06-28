import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type {
  ServiceStatus,
  UserProfile,
} from "./types";

// ---- Services (provider) -------------------------------------------------

export interface ServiceInput {
  title: string;
  description: string;
  category: string;
  price: number;
  /** Optional LinkedIn URL; only shown on the card when the provider provides it. */
  linkedin?: string;
  /** date (ISO) -> time slots ("HH:mm") available on that date. */
  availability: Record<string, string[]>;
}

function serviceFields(input: ServiceInput) {
  const linkedin = input.linkedin?.trim();
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    price: input.price,
    providerLinkedin: linkedin ? linkedin : null,
    availability: input.availability,
  };
}

export async function createService(
  profile: UserProfile,
  input: ServiceInput
): Promise<string> {
  const ref = await addDoc(collection(db, "services"), {
    providerId: profile.uid,
    providerName: profile.displayName,
    providerPhotoURL: profile.photoURL ?? null,
    ...serviceFields(input),
    status: "active" as ServiceStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(
  serviceId: string,
  input: ServiceInput
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), serviceFields(input));
}

export async function setServiceStatus(
  serviceId: string,
  status: ServiceStatus
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), { status });
}

export async function deleteService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, "services", serviceId));
}

// ---- Chat ----------------------------------------------------------------

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
  });
}

/** Mark a conversation as read for a user (clears its unread dot). */
export async function markChatRead(chatId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`lastRead.${uid}`]: serverTimestamp(),
  });
}

/**
 * Cancel a booking. The server verifies who you are, issues the PayPal refund
 * per policy, frees the slot, and notifies the chat. Returns the refunded amount.
 */
export async function cancelBooking(
  bookingId: string
): Promise<{ refundAmount: number }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("You're not signed in.");
  const res = await fetch("/api/cancel-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bookingId }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Could not cancel the session.");
  }
  return { refundAmount: Number(data.refundAmount) || 0 };
}

// ---- Provider applications -----------------------------------------------

export interface ApplicationInput {
  bio: string;
  experience: string;
  skills: string[];
  linkedin?: string;
  portfolio?: string;
  motivation: string;
}

export async function submitApplication(
  profile: UserProfile,
  input: ApplicationInput
): Promise<void> {
  // providerStatus on the user doc is admin-controlled; pending lives here.
  await setDoc(doc(db, "applications", profile.uid), {
    uid: profile.uid,
    displayName: profile.displayName,
    email: profile.email,
    bio: input.bio,
    experience: input.experience,
    skills: input.skills,
    linkedin: input.linkedin ?? "",
    portfolio: input.portfolio ?? "",
    motivation: input.motivation,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

/** Admin: approve or reject. Approval flips the applicant's user doc to provider. */
export async function reviewApplication(
  uid: string,
  approve: boolean
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "applications", uid), {
    status: approve ? "approved" : "rejected",
    reviewedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), {
    isProvider: approve,
    providerStatus: approve ? "approved" : "rejected",
  });
  await batch.commit();
}

// ---- User profile / admin moderation -------------------------------------

export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string | null }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

export async function setUserBlocked(
  uid: string,
  blocked: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { isBlocked: blocked });
}

// ---- Reports -------------------------------------------------------------

export interface ReportInput {
  subject: string;
  description: string;
  reportedId?: string;
  reportedName?: string;
}

export async function submitReport(
  reporter: UserProfile,
  input: ReportInput
): Promise<void> {
  await addDoc(collection(db, "reports"), {
    reporterId: reporter.uid,
    reporterName: reporter.displayName,
    reportedId: input.reportedId ?? null,
    reportedName: input.reportedName ?? null,
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function resolveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, "reports", reportId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
  });
}
