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
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't enabled for this project. Enable it in Firebase → Authentication → Sign-in method.";
    case "auth/unauthorized-domain":
      return "This site's domain isn't authorized. Add it in Firebase → Authentication → Settings → Authorized domains.";
    case "auth/account-exists-with-different-credential":
      return "You already signed up with this email using a different method. Sign in that way instead.";
    case "auth/network-request-failed":
      return "Network error. Check your connection — in local dev, make sure the Firebase emulator is running.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "App configuration error (invalid Firebase API key).";
    case "auth/internal-error":
      return "Sign-in failed. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Safe internal redirect target from a query param. */
export function safeRedirect(target: string | null | undefined): string {
  return target && target.startsWith("/") ? target : "/dashboard";
}

/**
 * Where a signed-in person lands: the personalized home (`/home`), which adapts
 * to the role (member vs host). Admins reach the admin panel from the menu.
 */
export function homePathForProfile(
  profile?: { isProvider?: boolean } | null
): string {
  void profile;
  return "/home";
}

/** Async variant kept for callers that await it right after sign-in. */
export async function homePathFor(uid?: string): Promise<string> {
  void uid;
  return "/home";
}
