"use client";

import React, { useState } from "react";
import { GoogleIcon } from "@/components/ui/google-icon";
import {
  appleSignInAvailable,
  googleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  type SocialResult,
} from "@/lib/social-sign-in";

interface SocialSignInProps {
  /** "in" on the login screen, "up" on registration. */
  verb: "in" | "up";
  /** Return false to stop before the provider sheet opens (e.g. terms unchecked). */
  beforeStart?: () => boolean;
  onSignedIn: (result: SocialResult) => Promise<void>;
  onError: (error: unknown) => void;
}

export function SocialSignIn({ verb, beforeStart, onSignedIn, onError }: SocialSignInProps) {
  const [showApple] = useState(appleSignInAvailable);
  const [showGoogle] = useState(googleSignInAvailable);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  if (!showApple && !showGoogle) return null;

  const run = (provider: "apple" | "google") => async () => {
    if (busy || (beforeStart && !beforeStart())) return;
    setBusy(provider);
    try {
      await onSignedIn(await (provider === "apple" ? signInWithApple() : signInWithGoogle()));
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  const base =
    "flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60";

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      {showApple && (
        <button
          type="button"
          onClick={run("apple")}
          disabled={busy !== null}
          className={`${base} bg-black text-white dark:bg-white dark:text-black`}
        >
          <svg viewBox="0 0 814 1000" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 61-88 123-156 123s-86-40-165-40c-77 0-104 41-167 41s-106-57-156-127C43 790 0 671 0 558c0-181 118-277 234-277 62 0 113 41 152 41 37 0 95-43 165-43 27 0 123 2 187 62zM554 158c29-35 50-83 50-131 0-7-1-14-2-19-48 2-104 32-138 71-27 30-52 78-52 127 0 7 1 15 2 17 3 1 8 1 13 1 43 0 97-29 127-66z" />
          </svg>
          Sign {verb} with Apple
        </button>
      )}
      {showGoogle && (
        <button
          type="button"
          onClick={run("google")}
          disabled={busy !== null}
          className={`${base} border border-border bg-background text-foreground`}
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </button>
      )}
    </div>
  );
}
