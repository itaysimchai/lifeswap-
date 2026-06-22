"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Wallet,
  CalendarCheck,
  History,
  Inbox,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useIncomingRequests, useOutgoingRequests } from "@/hooks/useRequests";
import { ReportDialog } from "@/components/report/ReportDialog";
import type { ServiceRequest } from "@/lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(iso?: string) {
  if (!iso) return "TBD";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const sortKey = (b: ServiceRequest) => `${b.scheduledDate ?? ""} ${b.scheduledTime ?? ""}`;

function split(bookings: ServiceRequest[]) {
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const upcoming = confirmed
    .filter((b) => (b.scheduledDate ?? "") >= TODAY)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = confirmed
    .filter((b) => (b.scheduledDate ?? "") < TODAY)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return { upcoming, past };
}

export default function MyDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const uid = profile?.uid;
  const isProvider = !!profile?.isProvider;

  const { data: asCustomer, loading: l1 } = useOutgoingRequests(uid);
  const { data: asHost, loading: l2 } = useIncomingRequests(uid);
  const loading = authLoading || l1 || (isProvider && l2);

  const customer = useMemo(() => split(asCustomer), [asCustomer]);
  const host = useMemo(() => split(asHost), [asHost]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {isProvider
            ? "The sessions you're hosting, your earnings, and anything you've booked."
            : "Your booked sessions."}
        </p>
      </div>

      {isProvider ? (
        <>
          {/* Host focus: hosted sessions + earnings come first */}
          <SessionGroup
            title="Sessions you're hosting"
            perspective="host"
            upcoming={host.upcoming}
            past={host.past}
            uid={uid}
          />
          <Earnings bookings={asHost} />
          <SessionGroup
            title="Sessions you booked"
            perspective="customer"
            upcoming={customer.upcoming}
            past={customer.past}
            uid={uid}
          />
        </>
      ) : (
        <SessionGroup
          title="Your sessions"
          perspective="customer"
          upcoming={customer.upcoming}
          past={customer.past}
          uid={uid}
        />
      )}
    </div>
  );
}

function SessionGroup({
  title,
  perspective,
  upcoming,
  past,
  uid,
}: {
  title: string;
  perspective: "customer" | "host";
  upcoming: ServiceRequest[];
  past: ServiceRequest[];
  uid: string | undefined;
}) {
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>

      <div className="space-y-3">
        <SubHeading icon={CalendarCheck}>Upcoming ({upcoming.length})</SubHeading>
        {upcoming.length === 0 ? (
          <EmptyRow>No upcoming sessions.</EmptyRow>
        ) : (
          upcoming.map((b) => (
            <SessionCard key={b.id} booking={b} perspective={perspective} uid={uid} />
          ))
        )}
      </div>

      <div className="space-y-3">
        <SubHeading icon={History}>Past ({past.length})</SubHeading>
        {past.length === 0 ? (
          <EmptyRow>No past sessions yet.</EmptyRow>
        ) : (
          past.map((b) => (
            <SessionCard key={b.id} booking={b} perspective={perspective} uid={uid} past />
          ))
        )}
      </div>
    </section>
  );
}

function SessionCard({
  booking,
  perspective,
  past,
}: {
  booking: ServiceRequest;
  perspective: "customer" | "host";
  uid: string | undefined;
  past?: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const other =
    perspective === "customer" ? booking.providerName : booking.requesterName;
  const otherId =
    perspective === "customer" ? booking.providerId : booking.requesterId;
  const otherLabel = perspective === "customer" ? "with" : "booked by";

  return (
    <Card className={past ? "opacity-80" : undefined}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback>{initials(other)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{booking.serviceTitle}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {otherLabel} {other}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
            <span className="font-semibold text-foreground">
              {booking.price && booking.price > 0 ? formatMoney(booking.price) : "Free"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {past ? (
            <Badge variant="outline" className="text-xs">
              Completed
            </Badge>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/messages">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReportOpen(true)}
            aria-label={`Report ${other}`}
            title={`Report ${other}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedId={otherId}
        reportedName={other}
      />
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

  const paid = useMemo(
    () => bookings.filter((b) => b.status === "confirmed" && b.paymentStatus === "paid"),
    [bookings]
  );

  const { total, count } = useMemo(() => {
    const def = PERIODS.find((p) => p.id === period)!;
    const cutoff = def.days === null ? 0 : Date.now() - def.days * 86_400_000;
    const inRange = paid.filter((b) => (b.createdAt?.toMillis() ?? 0) >= cutoff);
    return {
      total: inRange.reduce((s, b) => s + (b.price ?? 0), 0),
      count: inRange.length,
    };
  }, [paid, period]);

  return (
    <section className="space-y-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Wallet className="h-4 w-4 text-primary" />
        Earnings
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
            <div className="text-4xl font-bold tracking-tight text-foreground">
              {formatMoney(total)}
            </div>
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

function SubHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Icon className="h-4 w-4" />
      {children}
    </p>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
