"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Save, Briefcase, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { updateUserProfile } from "@/lib/actions";

function initials(name: string | undefined, email: string | undefined) {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setPhotoURL(profile.photoURL ?? "");
    }
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!displayName.trim()) {
      setError("Display name can't be empty.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        displayName: displayName.trim(),
        photoURL: photoURL.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile & settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account information.</p>
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="flex items-center gap-5 p-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoURL || undefined} />
            <AvatarFallback className="text-2xl">
              {initials(displayName, user?.email ?? undefined)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">
              {displayName || "Your account"}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {profile.role === "admin" && (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </Badge>
              )}
              <Badge variant={profile.isProvider ? "success" : "outline"}>
                {profile.isProvider ? "Provider" : "Member"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>Update your display name and photo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoURL">Photo URL (optional)</Label>
              <Input
                id="photoURL"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://…/avatar.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Paste an image link. File uploads are coming later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email can&apos;t be changed here.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" loading={saving}>
              {saved ? (
                "Saved!"
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Provider */}
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {profile.isProvider ? "Provider account" : "Offer your own services"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.isProvider
                  ? "Manage the services clients can book from you."
                  : "Apply to become a provider and start offering services."}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={profile.isProvider ? "/my-services" : "/become-provider"}>
              {profile.isProvider ? "My services" : "Become a provider"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => signOut()} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
