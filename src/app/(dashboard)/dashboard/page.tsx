"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  CalendarCheck,
  MessageSquare,
  SlidersHorizontal,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkedinIcon } from "@/components/ui/linkedin-icon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useServices } from "@/hooks/useServices";
import { useOutgoingRequests } from "@/hooks/useRequests";
import { BookingDialog } from "@/components/booking/BookingDialog";
import type { RequestStatus, Service } from "@/lib/types";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatPrice(price: number) {
  return price > 0 ? `$${price}` : "Free";
}

const ALL = "All";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const uid = profile?.uid;
  const { data: services, loading } = useServices();
  const { data: outgoing } = useOutgoingRequests(uid);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [bookingService, setBookingService] = useState<Service | null>(null);

  // serviceId -> the signed-in user's most recent booking status for it.
  const myBookingStatus = useMemo(() => {
    const map = new Map<string, RequestStatus>();
    for (const r of outgoing) if (!map.has(r.serviceId)) map.set(r.serviceId, r.status);
    return map;
  }, [outgoing]);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category));
    return [ALL, ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      const matchesCategory = category === ALL || s.category === category;
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.providerName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [services, search, category]);

  const hasFilters = search.trim() !== "" || category !== ALL;

  function resetFilters() {
    setSearch("");
    setCategory(ALL);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {profile ? `Welcome, ${profile.displayName.split(" ")[0]}` : "Browse services"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find a service, pick a time, and pay to confirm — then chat with the provider.
        </p>
      </div>

      {/* Search + filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services, providers, or keywords…"
            className="h-11 pl-10"
            aria-label="Search services"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </span>
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Services list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {hasFilters ? "Results" : "Available services"}
          </h2>
          {!loading && services.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "service" : "services"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No services available yet.
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
              No services match your search.
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                isOwn={service.providerId === uid}
                booked={myBookingStatus.get(service.id) === "confirmed"}
                canBook={!!profile}
                onBook={() => setBookingService(service)}
                onOpenDetails={() => router.push(`/services/${service.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <BookingDialog service={bookingService} onClose={() => setBookingService(null)} />
    </div>
  );
}

function ServiceRow({
  service,
  isOwn,
  booked,
  canBook,
  onBook,
  onOpenDetails,
}: {
  service: Service;
  isOwn: boolean;
  booked: boolean;
  canBook: boolean;
  onBook: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <Card
      onClick={onOpenDetails}
      className="cursor-pointer transition-colors hover:border-primary/40"
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* Left: host */}
        <div className="flex items-center gap-3 sm:w-48 sm:shrink-0 sm:flex-col sm:items-start sm:gap-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{initials(service.providerName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {service.providerName}
              </p>
              {service.providerLinkedin && (
                <a
                  href={service.providerLinkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${service.providerName} on LinkedIn`}
                  title="View LinkedIn profile"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"
                >
                  <LinkedinIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Provider</p>
          </div>
        </div>

        {/* Middle: title + description */}
        <div className="min-w-0 flex-1 border-border sm:border-x sm:px-6">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {service.category}
            </Badge>
            {isOwn && (
              <Badge variant="outline" className="text-xs">
                Your service
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold leading-snug text-foreground">{service.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View details
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: price + book */}
        <div className="flex items-center justify-between gap-3 sm:w-36 sm:shrink-0 sm:flex-col sm:items-center sm:justify-center sm:gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">
              {formatPrice(service.price)}
            </div>
            {service.price > 0 && (
              <div className="text-xs text-muted-foreground">per session</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5 sm:w-full">
            {isOwn ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : booked ? (
              <>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Booked
                </Badge>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/messages" onClick={(e) => e.stopPropagation()}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </Link>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full"
                disabled={!canBook}
                onClick={(e) => {
                  e.stopPropagation();
                  onBook();
                }}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Book now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
