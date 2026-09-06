"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  Calendar,
  Clock,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useMyServices } from "@/hooks/useServices";
import { setServiceStatus, deleteService } from "@/lib/actions";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import type { Service } from "@/lib/types";

function formatPrice(price: number) {
  return price > 0 ? `$${price}` : "Free";
}

export default function MyServicesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { data: services, loading } = useMyServices(profile?.uid);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: Service) {
    setEditing(s);
    setFormOpen(true);
  }

  async function togglePause(s: Service) {
    setBusy(s.id);
    try {
      await setServiceStatus(s.id, s.status === "active" ? "paused" : "active");
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: Service) {
    if (!window.confirm(`Delete "${s.title}"? This can't be undone.`)) return;
    setBusy(s.id);
    try {
      await deleteService(s.id);
    } finally {
      setBusy(null);
    }
  }

  // Gate: only approved providers can manage services.
  if (!authLoading && profile && !profile.isProvider) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Become a provider first</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Once your provider application is approved, you can publish and manage
                your own services here.
              </p>
            </div>
            <Button asChild>
              <Link href="/become-provider">Apply to become a provider</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My services</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage the services clients can book.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          New service
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t published any services yet.
            </p>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4" />
              Create your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.id} className={s.status === "paused" ? "opacity-75" : undefined}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {s.category}
                    </Badge>
                    <Badge
                      variant={s.status === "active" ? "success" : "outline"}
                      className="text-xs"
                    >
                      {s.status === "active" ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatPrice(s.price)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {Object.keys(s.availability ?? {}).length} dates
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {Object.values(s.availability ?? {}).reduce((n, t) => n + t.length, 0)} slots
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(s)}
                    disabled={busy === s.id}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePause(s)}
                    disabled={busy === s.id}
                  >
                    {s.status === "active" ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(s)}
                    disabled={busy === s.id}
                    aria-label="Delete service"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        service={editing}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
