"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import type { Role } from "@/lib/types";

/**
 * Client-side route guard. UX only — Firestore Security Rules are the real
 * authorization boundary. Redirects unauthenticated users to /login and,
 * when `role` is given, anyone lacking that role back to /dashboard.
 */
export function AuthGuard({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (role && profile && profile.role !== role) {
      router.replace("/dashboard");
    }
  }, [user, profile, loading, role, router, pathname]);

  const blocked = loading || !user || (role ? profile?.role !== role : false);

  if (blocked) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
