"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplications } from "@/hooks/useApplications";
import { reviewApplication } from "@/lib/actions";
import type { Application, ApplicationStatus } from "@/lib/types";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_BADGE: Record<ApplicationStatus, { variant: "warning" | "success" | "destructive"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
};

export default function AdminApplicationsPage() {
  const { data: applications, loading } = useApplications();
  const [busy, setBusy] = useState<string | null>(null);

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");
  const rejected = applications.filter((a) => a.status === "rejected");

  async function review(app: Application, approve: boolean) {
    setBusy(app.uid);
    try {
      await reviewApplication(app.uid, approve);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Provider applications</h1>
        <p className="mt-1 text-muted-foreground">Review and approve provider applications.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <ApplicationsList items={pending} loading={loading} busy={busy} onReview={review} />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ApplicationsList items={approved} loading={loading} busy={busy} onReview={review} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <ApplicationsList items={rejected} loading={loading} busy={busy} onReview={review} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationsList({
  items,
  loading,
  busy,
  onReview,
}: {
  items: Application[];
  loading: boolean;
  busy: string | null;
  onReview: (app: Application, approve: boolean) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nothing here.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((app) => (
        <ApplicationCard key={app.uid} app={app} busy={busy === app.uid} onReview={onReview} />
      ))}
    </div>
  );
}

function ApplicationCard({
  app,
  busy,
  onReview,
}: {
  app: Application;
  busy: boolean;
  onReview: (app: Application, approve: boolean) => void;
}) {
  const status = STATUS_BADGE[app.status];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback>{initials(app.displayName)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-foreground">
                    {app.displayName ?? "Applicant"}
                  </h3>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{app.email}</p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{app.bio}</p>

            <div className="mt-3 space-y-2 text-sm">
              <Detail label="Experience" value={app.experience} />
              <Detail label="Motivation" value={app.motivation} />
            </div>

            {app.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {app.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {(app.linkedin || app.portfolio) && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {app.linkedin && <LinkOut href={app.linkedin}>LinkedIn</LinkOut>}
                {app.portfolio && <LinkOut href={app.portfolio}>Portfolio</LinkOut>}
              </div>
            )}

            {app.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => onReview(app, true)}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onReview(app, false)}>
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            )}

            {app.status !== "pending" && (
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Reviewed
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}:{" "}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
