"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CalendarDays,
  Clock,
  Wallet,
  CalendarCheck,
  TrendingUp,
  Plus,
  ArrowRight,
  Inbox,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useServices } from "@/hooks/useServices";
import { useOutgoingRequests, useIncomingRequests } from "@/hooks/useRequests";
import { SessionCard } from "@/components/home/SessionCard";
import { CancelDialog } from "@/components/booking/CancelDialog";
import type { Service, ServiceRequest } from "@/lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const firstName = (name?: string) => (name?.trim().split(/\s+/)[0] ?? "there");

function fmtDate(iso?: string) {
  if (!iso) return "TBD";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const initials = (name?: string) =>
  (name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const keyOf = (b: ServiceRequest) => `${b.scheduledDate ?? ""} ${b.scheduledTime ?? ""}`;
function upcoming(list: ServiceRequest[]) {
  return list
    .filter((b) => b.status === "confirmed" && (b.scheduledDate ?? "") >= TODAY)
    .sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
}

/** Net income from a booking: full price when held, price − refund when cancelled. */
function netEarning(b: ServiceRequest): number {
  if (b.paymentStatus !== "paid") return 0;
  if (b.status === "confirmed") return b.price ?? 0;
  if (b.status === "cancelled") return Math.max(0, (b.price ?? 0) - (b.refundAmount ?? 0));
  return 0;
}

export default function HomePage() {
  const { profile, loading: authLoading } = useAuth();
  const uid = profile?.uid;
  const isProvider = !!profile?.isProvider;

  const { data: services, loading: servicesLoading } = useServices();
  const { data: outgoing, loading: outLoading } = useOutgoingRequests(uid);
  const { data: incoming, loading: inLoading } = useIncomingRequests(uid);

  const loading = authLoading || (isProvider ? inLoading : servicesLoading || outLoading);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {greeting()}, {firstName(profile?.displayName)}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          {isProvider
            ? "Here's what's happening with your sessions."
            : "Find your next session and pick up where you left off."}
        </p>
      </header>

      {loading ? (
        <HomeSkeleton />
      ) : isProvider ? (
        <HostHome incoming={incoming} outgoing={outgoing} />
      ) : (
        <MemberHome services={services} outgoing={outgoing} />
      )}
    </div>
  );
}

/* ─── Member home ──────────────────────────────────────────────────────────── */

function MemberHome({ services, outgoing }: { services: Service[]; outgoing: ServiceRequest[] }) {
  const [cat, setCat] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(services.map((s) => s.category))).sort()],
    [services]
  );

  const featured = useMemo(() => {
    const active = services.filter((s) => s.status !== "paused");
    const pool = cat === "All" ? active : active.filter((s) => s.category === cat);
    return [...pool]
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      .slice(0, 4);
  }, [services, cat]);

  const mine = useMemo(() => upcoming(outgoing).slice(0, 3), [outgoing]);

  return (
    <div className="space-y-12">
      {/* Featured sessions */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Featured sessions</h2>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Category chips */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {featured.length === 0 ? (
          <EmptyState icon={Compass}>
            No sessions in this category yet.{" "}
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              Browse all
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((s) => (
              <SessionCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Quick dashboard */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Your sessions</h2>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Messages
          </Link>
        </div>

        {mine.length === 0 ? (
          <EmptyState icon={CalendarCheck}>
            You haven&apos;t booked a session yet. Find an expert and book a time.
            <div className="mt-4">
              <Button asChild>
                <Link href="/dashboard">
                  Browse sessions <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {mine.map((b) => (
              <BookingRow key={b.id} booking={b} perspective="customer" />
            ))}
            <div className="pt-1">
              <Button asChild variant="outline">
                <Link href="/dashboard">Browse all sessions</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Host home ────────────────────────────────────────────────────────────── */

function HostHome({ incoming, outgoing }: { incoming: ServiceRequest[]; outgoing: ServiceRequest[] }) {
  const [now] = useState(() => Date.now());
  const hosting = useMemo(() => upcoming(incoming), [incoming]);
  const booked = useMemo(() => upcoming(outgoing).slice(0, 3), [outgoing]);

  const totalHosted = useMemo(
    () => incoming.filter((b) => b.status === "confirmed").length,
    [incoming]
  );
  const earnedThisMonth = useMemo(() => {
    const cutoff = now - 30 * 86_400_000;
    return incoming
      .filter((b) => (b.createdAt?.toMillis() ?? 0) >= cutoff)
      .reduce((s, b) => s + netEarning(b), 0);
  }, [incoming, now]);

  return (
    <div className="space-y-12">
      {/* Snapshot */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Earned this month" value={money(earnedThisMonth)} accent />
        <StatCard icon={CalendarCheck} label="Upcoming" value={String(hosting.length)} />
        <StatCard icon={TrendingUp} label="Sessions hosted" value={String(totalHosted)} />
        <StatCard icon={Inbox} label="You booked" value={String(booked.length)} />
      </section>

      {/* Next sessions you're hosting */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Next sessions you&apos;re hosting</h2>
          <Button asChild size="sm">
            <Link href="/my-services">
              <Plus className="h-4 w-4" /> Add a session
            </Link>
          </Button>
        </div>
        {hosting.length === 0 ? (
          <EmptyState icon={CalendarCheck}>
            No upcoming sessions yet. Publish a service and set your availability so people can book
            you.
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/my-services">Manage my services</Link>
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {hosting.slice(0, 5).map((b) => (
              <BookingRow key={b.id} booking={b} perspective="host" />
            ))}
          </div>
        )}
      </section>

      {/* Earnings */}
      <Earnings bookings={incoming} />

      {/* Sessions you booked (secondary) */}
      {booked.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Sessions you booked</h2>
          <div className="space-y-3">
            {booked.map((b) => (
              <BookingRow key={b.id} booking={b} perspective="customer" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Shared pieces ────────────────────────────────────────────────────────── */

function BookingRow({
  booking,
  perspective,
}: {
  booking: ServiceRequest;
  perspective: "customer" | "host";
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const other = perspective === "customer" ? booking.providerName : booking.requesterName;
  const label = perspective === "customer" ? "with" : "booked by";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback>{initials(other)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{booking.serviceTitle}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {label} {other}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {fmtDate(booking.scheduledDate)}
            </span>
            {booking.scheduledTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {booking.scheduledTime}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/messages">
              <MessageSquare className="h-3.5 w-3.5" /> Message
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            Cancel
          </Button>
        </div>
      </CardContent>

      <CancelDialog
        booking={booking}
        perspective={perspective}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

type Period = "week" | "month" | "year" | "lifetime";
const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
  { id: "lifetime", label: "Lifetime", days: null },
];

function Earnings({ bookings }: { bookings: ServiceRequest[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [now] = useState(() => Date.now());
  const paid = useMemo(
    () => bookings.filter((b) => b.paymentStatus === "paid"),
    [bookings]
  );
  const { total, count } = useMemo(() => {
    const def = PERIODS.find((p) => p.id === period)!;
    const cutoff = def.days === null ? 0 : now - def.days * 86_400_000;
    const inRange = paid.filter((b) => (b.createdAt?.toMillis() ?? 0) >= cutoff);
    let total = 0;
    let count = 0;
    for (const b of inRange) {
      const net = netEarning(b);
      if (net > 0) {
        total += net;
        count += 1;
      }
    }
    return { total, count };
  }, [paid, period, now]);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Wallet className="h-5 w-5 text-primary" /> Earnings
      </h2>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  period === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <div className="text-4xl font-bold tracking-tight text-foreground">{money(total)}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              from {count} paid {count === 1 ? "session" : "sessions"} (
              {PERIODS.find((p) => p.id === period)!.label.toLowerCase()})
            </p>
          </div>
          {paid.length > 0 && total === 0 && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" />
              Your sessions are currently free — set a price in My Services to start earning.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center text-sm text-muted-foreground">
        <Icon className="mb-3 h-8 w-8 opacity-40" />
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-60 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
