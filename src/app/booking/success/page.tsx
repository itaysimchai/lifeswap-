"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Calendar,
  CalendarPlus,
  MessageSquare,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { googleCalendarLink } from "@/lib/email";

interface Confirmed {
  serviceTitle: string;
  providerName: string;
  date: string;
  time: string;
  price: number;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function SuccessInner() {
  const params = useSearchParams();
  const sid = params.get("sid");
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [booking, setBooking] = useState<Confirmed | null>(null);
  const [error, setError] = useState<string | null>(null);
  // React 19 Strict Mode runs effects twice in dev; guard so we confirm once.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!sid) {
      setState("error");
      setError("No payment reference found.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/checkout/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not confirm payment.");
        setBooking(data);
        setState("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setState("error");
      }
    })();
  }, [sid]);

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Confirming your payment…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <XCircle className="h-8 w-8" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Payment not confirmed</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">Booking confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re all set for {booking?.serviceTitle} with{" "}
          {booking?.providerName}. A confirmation email is on its way.
        </p>
        {booking?.date && booking?.time && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            {formatDate(booking.date)} · {booking.time}
          </p>
        )}
      </div>

      <div className="w-full max-w-xs space-y-2.5">
        {booking && (
          <Button asChild variant="outline" className="w-full">
            <a
              href={googleCalendarLink({
                serviceTitle: booking.serviceTitle,
                providerName: booking.providerName,
                requesterName: "",
                date: booking.date,
                time: booking.time,
                price: booking.price,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Google Calendar
            </a>
          </Button>
        )}
        <Button asChild className="w-full">
          <Link href="/messages">
            <MessageSquare className="h-4 w-4" />
            Message {booking?.providerName ?? "provider"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <SuccessInner />
        </Suspense>
      </div>
    </div>
  );
}
