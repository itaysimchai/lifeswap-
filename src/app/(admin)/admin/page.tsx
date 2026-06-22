"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  UserCheck,
  FileText,
  Flag,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useApplications } from "@/hooks/useApplications";
import { reviewApplication } from "@/lib/actions";
import type { Application } from "@/lib/types";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminDashboardPage() {
  const { stats, loading } = useAdminStats();
  const { data: applications } = useApplications();
  const [busy, setBusy] = useState<string | null>(null);

  const pending = applications.filter((a) => a.status === "pending");

  async function review(app: Application, approve: boolean) {
    setBusy(app.uid);
    try {
      await reviewApplication(app.uid, approve);
    } finally {
      setBusy(null);
    }
  }

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "Providers", value: stats.providers, icon: UserCheck },
    { label: "Active services", value: stats.activeServices, icon: Briefcase },
    { label: "Pending applications", value: stats.pendingApplications, icon: FileText },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="mt-1 text-muted-foreground">Platform health at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-4 w-4" />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">{card.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending applications */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Pending applications
            {pending.length > 0 && <Badge variant="warning">{pending.length}</Badge>}
          </h2>
          <Link href="/admin/applications">
            <Button variant="outline" size="sm" className="gap-1">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {pending.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No applications waiting for review.
              </CardContent>
            </Card>
          )}

          {pending.map((app) => (
            <Card key={app.uid}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-sm">
                        {initials(app.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {app.displayName ?? "Applicant"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{app.email}</p>
                    </div>
                  </div>

                  <div className="hidden flex-wrap gap-1 sm:flex">
                    {app.skills?.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      disabled={busy === app.uid}
                      onClick={() => review(app, true)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      disabled={busy === app.uid}
                      onClick={() => review(app, false)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/applications">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                Review applications
              </CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Approve or reject provider applications.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Flag className="h-4 w-4 text-primary" />
                Reports
              </CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Review reports and block accounts.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                Manage users
              </CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Block or unblock accounts.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
