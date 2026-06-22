import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

/** Create the users/{uid} profile doc on first sign-in if it doesn't exist. */
export async function ensureUserDoc(user: User, displayName?: string) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? "",
      displayName:
        displayName ?? user.displayName ?? user.email?.split("@")[0] ?? "User",
      photoURL: user.photoURL ?? null,
      role: "user",
      isProvider: false,
      providerStatus: "none",
      isBlocked: false,
      createdAt: serverTimestamp(),
    });
  }
}

/** Map Firebase auth error codes to human-friendly copy. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a moment.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Safe internal redirect target from a query param. */
export function safeRedirect(target: string | null | undefined): string {
  return target && target.startsWith("/") ? target : "/dashboard";
}

/**
 * Where a signed-in person belongs: hosts default to their dashboard, everyone
 * else (members + admins) to the browse/services page. Admins reach the admin
 * panel from the account menu.
 */
export function homePathForProfile(
  profile: { isProvider?: boolean } | null | undefined
): string {
  return profile?.isProvider ? "/my-dashboard" : "/dashboard";
}

/** Async variant used right after sign-in, before the profile snapshot loads. */
export async function homePathFor(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return homePathForProfile({ isProvider: snap.data()?.isProvider === true });
  } catch {
    return "/dashboard";
  }
}
