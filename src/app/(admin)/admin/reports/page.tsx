"use client";

import React, { useMemo, useState } from "react";
import { Flag, Ban, RotateCcw, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReports } from "@/hooks/useReports";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import { resolveReport, setUserBlocked } from "@/lib/actions";
import type { Report, UserProfile } from "@/lib/types";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminReportsPage() {
  const { profile: me } = useAuth();
  const { data: reports, loading } = useReports();
  const { data: users } = useUsers();
  const [busy, setBusy] = useState<string | null>(null);

  const usersById = useMemo(() => {
    const m = new Map<string, UserProfile>();
    for (const u of users) m.set(u.uid, u);
    return m;
  }, [users]);

  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status === "resolved");

  async function block(uid: string, next: boolean) {
    setBusy(uid);
    try {
      await setUserBlocked(uid, next);
    } finally {
      setBusy(null);
    }
  }

  async function resolve(reportId: string) {
    setBusy(reportId);
    try {
      await resolveReport(reportId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Review user reports and block accounts when needed.
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <ReportsList
            items={open}
            loading={loading}
            busy={busy}
            usersById={usersById}
            meUid={me?.uid}
            onBlock={block}
            onResolve={resolve}
          />
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          <ReportsList
            items={resolved}
            loading={loading}
            busy={busy}
            usersById={usersById}
            meUid={me?.uid}
            onBlock={block}
            onResolve={resolve}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsList({
  items,
  loading,
  busy,
  usersById,
  meUid,
  onBlock,
  onResolve,
}: {
  items: Report[];
  loading: boolean;
  busy: string | null;
  usersById: Map<string, UserProfile>;
  meUid?: string;
  onBlock: (uid: string, next: boolean) => void;
  onResolve: (reportId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
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
      {items.map((r) => {
        const reported = r.reportedId ? usersById.get(r.reportedId) : undefined;
        const canBlock =
          !!r.reportedId &&
          r.reportedId !== meUid &&
          reported?.role !== "admin";
        return (
          <Card key={r.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <Flag className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{r.subject}</h3>
                    <Badge variant={r.status === "open" ? "warning" : "secondary"} className="text-xs">
                      {r.status === "open" ? "Open" : "Resolved"}
                    </Badge>
                    {reported?.isBlocked && (
                      <Badge variant="destructive" className="text-xs">
                        Reported user blocked
                      </Badge>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {r.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">
                          {initials(r.reporterName)}
                        </AvatarFallback>
                      </Avatar>
                      Reporter: {r.reporterName}
                    </span>
                    {r.reportedName && (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {initials(r.reportedName)}
                          </AvatarFallback>
                        </Avatar>
                        Reported: <span className="font-medium text-foreground">{r.reportedName}</span>
                      </span>
                    )}
                  </div>

                  {r.status === "open" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canBlock &&
                        (reported?.isBlocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === r.reportedId}
                            onClick={() => onBlock(r.reportedId!, false)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Unblock {r.reportedName}
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy === r.reportedId}
                            onClick={() => onBlock(r.reportedId!, true)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Block {r.reportedName}
                          </Button>
                        ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() => onResolve(r.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark resolved
                      </Button>
                    </div>
                  )}

                  {r.status === "resolved" && (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Resolved
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
