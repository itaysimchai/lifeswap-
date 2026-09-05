"use client";

import React, { useMemo, useState } from "react";
import { Search, ShieldCheck, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/providers/AuthProvider";
import { useUsers } from "@/hooks/useUsers";
import { setUserBlocked } from "@/lib/actions";
import type { UserProfile } from "@/lib/types";

function initials(name: string | undefined, email: string | undefined) {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export default function AdminUsersPage() {
  const { profile: me } = useAuth();
  const { data: users, loading } = useUsers();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function toggleBlock(u: UserProfile) {
    setBusy(u.uid);
    try {
      await setUserBlocked(u.uid, !u.isBlocked);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-muted-foreground">Manage accounts and block abusive users.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-10"
          aria-label="Search users"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isSelf = u.uid === me?.uid;
                  const isAdmin = u.role === "admin";
                  return (
                    <TableRow key={u.uid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.photoURL ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {initials(u.displayName, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {u.displayName || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {isAdmin && (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                          <Badge variant={u.isProvider ? "success" : "outline"}>
                            {u.isProvider ? "Provider" : "Member"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.isBlocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf || isAdmin ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : u.isBlocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === u.uid}
                            onClick={() => toggleBlock(u)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy === u.uid}
                            onClick={() => toggleBlock(u)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Block
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
