import type { Timestamp } from "firebase/firestore";

export type Role = "user" | "admin";
export type ProviderStatus = "none" | "pending" | "approved" | "rejected";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: Role;
  isProvider: boolean;
  providerStatus: ProviderStatus;
  isBlocked?: boolean;
  createdAt?: Timestamp | null;
}

export type ServiceStatus = "active" | "paused";

export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  /** Host's photo, denormalized at create time so cards can show it. */
  providerPhotoURL?: string | null;
  /** Optional — the provider chooses whether to show a LinkedIn link on the card. */
  providerLinkedin?: string | null;
  title: string;
  description: string;
  category: string;
  price: number;
  /**
   * Host availability: each date maps to its OWN time slots.
   * e.g. { "2026-06-22": ["09:00","13:00"], "2026-06-24": ["15:30"] }
   */
  availability?: Record<string, string[]>;
  status: ServiceStatus;
  createdAt?: Timestamp | null;
}

export type PaymentMethod = "stripe" | "paypal";

/**
 * A booking. In the current flow there is no host approval: a paid booking is
 * created directly as "confirmed", which also opens the chat. ("pending" /
 * "accepted" / "declined" remain for backward compatibility.)
 */
export type RequestStatus =
  | "confirmed"
  | "cancelled"
  | "pending"
  | "accepted"
  | "declined";

export interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceTitle: string;
  requesterId: string;
  requesterName: string;
  providerId: string;
  providerName: string;
  message?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  price?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: "paid";
  status: RequestStatus;
  /** Set when cancelled — who cancelled and how much was refunded. */
  cancelledBy?: "host" | "customer";
  refundAmount?: number;
  createdAt?: Timestamp | null;
}

export interface Chat {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  serviceId?: string;
  serviceTitle?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  /** Who sent the most recent message — used to flag *received* (not sent) unread. */
  lastSenderId?: string;
  /** Per-user "last read" time; a chat is unread when lastMessageAt is newer. */
  lastRead?: Record<string, Timestamp>;
  createdAt?: Timestamp | null;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp | null;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  uid: string;
  displayName?: string;
  email?: string;
  bio: string;
  experience: string;
  skills: string[];
  linkedin?: string;
  portfolio?: string;
  motivation: string;
  status: ApplicationStatus;
  createdAt?: Timestamp | null;
  reviewedAt?: Timestamp | null;
}

/**
 * A claimed time slot, used to block double-booking and to hide overlapping
 * slots in the booking modal (sessions are 1 hour, so a slot at 11:00 also
 * blocks 11:30). Public-readable so customers see what's taken without being
 * able to read other people's private bookings.
 */
export interface BookedSlot {
  id: string;
  serviceId: string;
  providerId: string;
  date: string; // "yyyy-mm-dd"
  time: string; // "HH:mm"
  createdAt?: Timestamp | null;
}

export type ReportStatus = "open" | "resolved";

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  /** The person being reported, when the report is about someone specific. */
  reportedId?: string | null;
  reportedName?: string | null;
  subject: string;
  description: string;
  status: ReportStatus;
  createdAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;
}

export const SERVICE_CATEGORIES = [
  "Software Engineering",
  "Product Management",
  "Design",
  "Data Science & AI",
  "Career Coaching",
  "Business Strategy",
  "Marketing",
  "Languages",
] as const;
