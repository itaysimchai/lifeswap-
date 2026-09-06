"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  /** True until the Firebase auth state is known. Does NOT wait for the profile. */
  loading: boolean;
  /** True while the Firestore user document is still being fetched. */
  profileLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  signOut: async () => {},
});

// Firebase is imported dynamically so it lands in its own chunk instead of the
// entry bundle — the app shell can paint before the SDK is parsed.
const loadAuth = () => Promise.all([import("firebase/auth"), import("@/lib/firebase")]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unsub: (() => void) | undefined;

    void (async () => {
      const [{ onAuthStateChanged }, { auth }] = await loadAuth();
      if (disposed) return;
      unsub = onAuthStateChanged(auth, (u: User | null) => {
        setUser(u);
        if (!u) setProfile(null);
        // Resolve as soon as auth is known. Waiting for the Firestore profile
        // here cost a second network round trip before anything rendered.
        setLoading(false);
      });
    })();

    return () => {
      disposed = true;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let disposed = false;
    let unsub: (() => void) | undefined;
    setProfileLoading(true);

    void (async () => {
      const [{ doc, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      if (disposed) return;
      unsub = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          setProfile(snap.exists() ? ({ uid: user.uid, ...snap.data() } as UserProfile) : null);
          setProfileLoading(false);
        },
        () => setProfileLoading(false)
      );
    })();

    return () => {
      disposed = true;
      unsub?.();
    };
  }, [user]);

  const signOut = async () => {
    const [{ signOut: fbSignOut }, { auth }] = await loadAuth();
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
