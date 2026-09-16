"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  CalendarCheck,
  MessageSquare,
  CheckCircle2,
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
      <div data-page-header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {profile ? `Welcome, ${profile.displayName.split(" ")[0]}` : "Browse services"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find a service, pick a time, and pay to confirm - then chat with the provider.
        </p>
      </div>

      {/* Search + filters. Sticky and translucent: the list scrolls underneath,
          so the controls that shape it stay reachable without a scroll back up.
          Categories run on one scrolling rail - wrapped chips cost three rows
          of a phone screen before a single result appears. */}
      <div data-fullbleed className="mobile-filters">
        <div className="relative px-4">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions, hosts, keywords"
            className="h-11 rounded-xl pl-10"
            aria-label="Search services"
          />
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2.5">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors active:opacity-60",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
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
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
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
  /* Phone-first. The desktop version split this into three bordered columns,
     which at 390pt collapses into a tall stack with a stray divider in it.
     Here the host is a caption, the title leads, and price sits with the one
     action - so the whole card is scannable in one pass. */
  return (
    <Card
      onClick={onOpenDetails}
      className="cursor-pointer transition-colors active:border-primary/40"
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs">{initials(service.providerName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">
              {service.providerName}
            </span>
            {service.providerLinkedin && (
              <a
                href={service.providerLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`${service.providerName} on LinkedIn`}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground active:text-[#0A66C2]"
              >
                <LinkedinIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-[11px]">
            {service.category}
          </Badge>
        </div>

        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-snug text-foreground">
            {service.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold text-foreground">
              {formatPrice(service.price)}
            </span>
            {service.price > 0 && (
              <span className="text-[12px] text-muted-foreground">per session</span>
            )}
          </div>

          {isOwn ? (
            <Badge variant="outline" className="text-[11px]">
              Your service
            </Badge>
          ) : booked ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1 text-[11px]">
                <CheckCircle2 className="h-3 w-3" />
                Booked
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href="/messages" onClick={(e) => e.stopPropagation()}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
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
      </CardContent>
    </Card>
  );
}
