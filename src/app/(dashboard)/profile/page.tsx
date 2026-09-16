"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  Briefcase,
  FileText,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRow, ListSection, Segmented } from "@/components/ui/list";
import { useAuth } from "@/providers/AuthProvider";
import { updateUserProfile, deleteAccountData } from "@/lib/actions";
import { AVATAR_ACCEPT, removeAvatar, uploadAvatar, type UploadStage } from "@/lib/avatar";
import { usePushNotifications, type PushAvailability } from "@/lib/push";

function initials(name: string | undefined, email: string | undefined) {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return (email?.[0] ?? "U").toUpperCase();
}

type ThemeChoice = "light" | "dark" | "system";

/** Firebase's raw storage errors are unreadable; say what actually went wrong. */
function describeUploadError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "storage/unauthorized")
    return "Photo uploads are not enabled for this project yet. Deploy storage.rules to allow them.";
  if (code === "storage/canceled") return "Upload cancelled.";
  if (code === "storage/retry-limit-exceeded")
    return "The upload timed out. Check your connection and try again.";
  if (code === "storage/unknown" || code === "storage/retry-limit-exceeded")
    return "Photo storage is not set up for this project yet. Enable Firebase Storage and deploy storage.rules.";
  if (code === "storage/bucket-not-found" || code === "storage/project-not-found")
    return "Photo storage is not set up for this project yet. Enable Firebase Storage in the console.";
  return e instanceof Error ? e.message : "Could not upload that photo.";
}

const PUSH_FOOTER: Record<PushAvailability, string> = {
  supported: "Get alerted when someone messages you or requests a session.",
  outdated: "Update LifeSwap to turn on notifications.",
  // Only reachable in a desktop browser preview of the app.
  web: "Notifications work on iPhone.",
};

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const push = usePushNotifications(user?.uid);

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoStage, setPhotoStage] = useState<UploadStage | null>(null);
  // Local object URL shown while the real one is still being produced.
  const [preview, setPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // next-themes resolves nothing on the first render, so the segmented control
  // would flash the wrong selection without this.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName ?? "");
  }, [profile]);

  // The preview outlives the upload, so it is released when it is replaced or
  // when the screen goes away - not at the end of the upload.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  /* The file input opens the system photo picker in WKWebView, which is
     out-of-process - so it needs no photo-library permission string and no
     native plugin.

     The picked file is shown immediately from an object URL. Everything after
     that - decode, downscale, upload, the Firestore write, and the snapshot
     that comes back - is four sequential waits the user should never sit
     through staring at their old photo. */
  async function onPickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setPreview(URL.createObjectURL(file));
    setPhotoBusy(true);
    setPhotoStage("processing");
    setPhotoError(null);
    try {
      const url = await uploadAvatar(profile.uid, file, setPhotoStage);
      await updateUserProfile(profile.uid, { photoURL: url });
    } catch (e) {
      setPreview(null);
      console.error("avatar upload failed", e);
      setPhotoError(describeUploadError(e));
    } finally {
      setPhotoBusy(false);
      setPhotoStage(null);
    }
  }

  async function onRemovePhoto() {
    if (!profile) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setPreview(null);
      await removeAvatar(profile.uid);
      await updateUserProfile(profile.uid, { photoURL: null });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not remove that photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

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
      await updateUserProfile(profile.uid, { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  // App Store guideline 5.1.1(v): an account created in the app must be
  // deletable from inside the app.
  async function handleDelete() {
    if (!user) return;
    if (
      !window.confirm(
        "Permanently delete your LifeSwap account? Your profile and any services you offer will be removed. This cannot be undone."
      )
    )
      return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const [{ deleteUser, reauthenticateWithCredential, EmailAuthProvider }, { auth }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebase")]);
      const current = auth.currentUser;
      if (!current) throw new Error("You are no longer signed in.");

      // Re-authenticate first. Deleting the Firestore data before we know the
      // auth deletion can succeed would leave an account with no profile.
      const usesPassword = current.providerData.some((pr) => pr.providerId === "password");
      if (usesPassword) {
        if (!password) {
          setNeedsPassword(true);
          setDeleting(false);
          return;
        }
        const cred = EmailAuthProvider.credential(current.email ?? "", password);
        await reauthenticateWithCredential(current, cred);
      }

      await deleteAccountData(current.uid);
      await deleteUser(current);
      // Auth state flips to signed-out, which routes back to /login.
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setDeleteError("For your security, sign out and sign in again, then retry.");
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setDeleteError("That password is incorrect.");
      } else {
        setDeleteError(
          (e as Error)?.message ?? "Could not delete your account. Please try again."
        );
      }
    } finally {
      setDeleting(false);
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

  const nameDirty = displayName.trim() !== (profile.displayName ?? "").trim();
  const pushOn = push.state === "granted";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div data-page-header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile &amp; Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account information.</p>
      </div>

      {/* Identity */}
      <section className="flex flex-col items-center gap-3 pt-1 text-center">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={photoBusy}
          className="rounded-full transition-opacity active:opacity-60 disabled:opacity-50"
          aria-label="Change profile photo"
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={preview ?? profile.photoURL ?? undefined} />
            <AvatarFallback className="text-2xl">
              {initials(profile.displayName, user?.email ?? undefined)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div>
          <p className="text-[17px] font-semibold text-foreground">{profile.displayName}</p>
          <p className="text-[13px] text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-4 text-[15px] font-medium text-primary">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy}>
            {photoBusy
              ? photoStage === "processing"
                ? "Preparing…"
                : "Uploading…"
              : profile.photoURL
                ? "Change photo"
                : "Add photo"}
          </button>
          {profile.photoURL && !photoBusy && (
            <button type="button" onClick={onRemovePhoto} className="text-destructive">
              Remove
            </button>
          )}
        </div>
        {photoError && <p className="text-[13px] text-destructive">{photoError}</p>}
        <input
          ref={fileInput}
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={onPickPhoto}
          /* Not `hidden`: a display:none file input never opens the picker in
             WKWebView. sr-only keeps it in the layout but out of sight. */
          className="sr-only"
        />
      </section>

      <ListSection title="Appearance">
        <ListRow label="Theme" chevron={false}>
          <Segmented<ThemeChoice>
            label="Theme"
            value={mounted ? ((theme as ThemeChoice) ?? "system") : "system"}
            onChange={setTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </ListRow>
      </ListSection>

      <ListSection
        title="Notifications"
        footer={push.error ?? PUSH_FOOTER[push.availability]}
      >
        <ListRow
          icon={Bell}
          label="Push notifications"
          chevron={false}
          disabled={!push.supported || push.busy}
        >
          <Switch
            checked={pushOn}
            disabled={!push.supported || push.busy}
            onCheckedChange={(next) => void (next ? push.enable() : push.disable())}
            aria-label="Push notifications"
          />
        </ListRow>
      </ListSection>

      <form onSubmit={onSave}>
        <ListSection title="Account" footer={error ?? "Your email cannot be changed here."}>
          <div className="space-y-2 border-b border-border px-4 py-3">
            <Label htmlFor="displayName" className="text-[13px] text-muted-foreground">
              Display name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2 px-4 py-3">
            <Label htmlFor="email" className="text-[13px] text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ""}
              disabled
              className="opacity-60"
            />
          </div>
        </ListSection>
        {nameDirty && (
          <Button type="submit" loading={saving} className="mt-3 w-full">
            {saved ? "Saved!" : "Save changes"}
          </Button>
        )}
      </form>

      <ListSection title={profile.isProvider ? "Provider" : "Hosting"}>
        <ListRow
          icon={Briefcase}
          label={profile.isProvider ? "My services" : "Become a provider"}
          detail={
            profile.isProvider
              ? "Manage the services clients can book from you."
              : "Apply to offer your own services on LifeSwap."
          }
          href={profile.isProvider ? "/my-services" : "/become-provider"}
        />
        {profile.role === "admin" && <ListRow icon={ShieldCheck} label="Admin" href="/admin" />}
      </ListSection>

      <ListSection title="Legal & support">
        <ListRow icon={ShieldCheck} label="Privacy Policy" href="/privacy" />
        <ListRow icon={FileText} label="Terms of Use" href="/terms" />
        <ListRow icon={LifeBuoy} label="Contact support" href="mailto:nadrty8@gmail.com" />
      </ListSection>

      <ListSection>
        <ListRow icon={LogOut} label="Sign out" onClick={() => void signOut()} chevron={false} />
      </ListSection>

      <ListSection
        title="Danger zone"
        footer={
          deleteError ??
          "Permanently removes your profile and any services you offer. This cannot be undone."
        }
      >
        {needsPassword && (
          <div className="space-y-2 border-b border-border px-4 py-3">
            <Label htmlFor="delete-password" className="text-[13px] text-muted-foreground">
              Confirm your password to continue
            </Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <ListRow
          icon={Trash2}
          label={needsPassword ? "Confirm delete" : "Delete my account"}
          destructive
          chevron={false}
          disabled={deleting}
          onClick={handleDelete}
        />
      </ListSection>
    </div>
  );
}
