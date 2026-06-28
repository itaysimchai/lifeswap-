"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CreditCard,
  Lock,
  Check,
  CheckCircle2,
  CalendarPlus,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useBookedSlots } from "@/hooks/useBookedSlots";
import { bookService } from "@/lib/actions";
import { googleCalendarLink } from "@/lib/email";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { PaymentMethod, Service } from "@/lib/types";

const SESSION_MINUTES = 60;
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const DEFAULT_TIMES = ["09:00", "10:30", "13:00", "15:30"];

/** Fallback availability (date -> times) when a host hasn't set any yet. */
function fallbackAvailability(count = 6): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const d = new Date();
  for (let i = 1; Object.keys(map).length < count; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    map[day.toISOString().slice(0, 10)] = DEFAULT_TIMES;
  }
  return map;
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

function formatPrice(price: number): string {
  return price > 0 ? `$${price}` : "Free";
}

function PaypalGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M7.08 21.34l.43-2.74H4.3l2.5-15.8a.66.66 0 0 1 .65-.56h6.04c2.86 0 4.83 1.16 4.43 4.06-.45 3.28-2.6 4.78-5.62 4.78H9.6a.66.66 0 0 0-.65.56l-.86 5.46-.33 2.1a.5.5 0 0 1-.5.42H7.1zM18.7 7.55c.74.5 1.1 1.36.9 2.74-.45 3.27-2.6 4.77-5.62 4.77h-1.7a.66.66 0 0 0-.65.56l-.9 5.7h2.78a.58.58 0 0 0 .57-.49l.4-2.5h1.94c2.64 0 4.5-1.31 4.9-4.18.27-1.9-.4-3.1-1.6-3.7-.2.34-.5.65-.83.9z" />
    </svg>
  );
}

const METHODS: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "stripe",
    title: "Card",
    subtitle: "Visa, Mastercard · via Stripe",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: "paypal",
    title: "PayPal",
    subtitle: "Pay with your PayPal account",
    icon: <PaypalGlyph className="h-5 w-5" />,
  },
];

export function BookingDialog({
  service,
  onClose,
}: {
  service: Service | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { profile } = useAuth();

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reset selections whenever a different service is opened.
  useEffect(() => {
    setDate(null);
    setTime(null);
    setMethod(null);
    setError(null);
    setPaying(false);
    setDone(false);
  }, [service?.id]);

  // Each date carries its own time slots.
  const availability = useMemo(() => {
    const a = service?.availability;
    return a && Object.keys(a).length ? a : fallbackAvailability();
  }, [service]);
  const dates = useMemo(
    () => Object.keys(availability).filter((d) => availability[d].length > 0).sort(),
    [availability]
  );

  // Slots already taken (1-hour sessions), used to hide overlapping times.
  const { data: bookedSlots } = useBookedSlots(service?.id);
  const takenOnDate = useMemo(
    () => bookedSlots.filter((b) => b.date === date).map((b) => toMinutes(b.time)),
    [bookedSlots, date]
  );

  // Times shown depend on the selected date, minus any that overlap a booking.
  const times = useMemo(() => {
    if (!date) return [];
    return (availability[date] ?? []).filter(
      (slot) =>
        !takenOnDate.some((b) => Math.abs(toMinutes(slot) - b) < SESSION_MINUTES)
    );
  }, [date, availability, takenOnDate]);

  function selectDate(d: string) {
    setDate(d);
    setTime(null); // time is date-specific — clear any earlier pick
  }

  const canPay = !!date && !!time && !!method && !paying;

  // Real Stripe is active only when a publishable key is configured. Without it
  // the dialog keeps its original demo behaviour, so the app still works.
  const stripeEnabled = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const paypalEnabled = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  async function handlePay() {
    if (!service || !profile || !date || !time || !method) return;
    setPaying(true);
    setError(null);

    // Card via real Stripe → redirect to Stripe-hosted checkout. The booking is
    // created server-side after Stripe confirms the charge (see PAYMENTS.md).
    if (method === "stripe" && stripeEnabled && service.price > 0) {
      try {
        const res = await fetch("/api/checkout/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: service.id,
            date,
            time,
            requesterId: profile.uid,
            providerId: service.providerId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Could not start checkout.");
        }
        window.location.href = data.url; // leaves the app for Stripe
        return; // keep the spinner during navigation
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout.");
        setPaying(false);
        return;
      }
    }

    // PayPal (and the demo card path) still use the simulated booking for now.
    try {
      await bookService(profile, service, { date, time, paymentMethod: method });
      setPaying(false);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPaying(false);
    }
  }

  function goToMessages() {
    onClose();
    router.push("/messages");
  }

  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-6 sm:max-w-lg">
        {service && done && (
          <>
            <DialogHeader>
              <DialogTitle>Booking confirmed</DialogTitle>
              <DialogDescription>
                A confirmation email with these details — and an option to add it to
                your calendar — is on its way to you and {service.providerName}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{service.title}</p>
                <p className="text-sm text-muted-foreground">
                  with {service.providerName}
                </p>
                {date && time && (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatDate(date)} · {time}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <Button asChild variant="outline" className="w-full">
                <a
                  href={googleCalendarLink({
                    serviceTitle: service.title,
                    providerName: service.providerName,
                    requesterName: profile?.displayName ?? "",
                    date: date ?? "",
                    time: time ?? "",
                    price: service.price,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Add to Google Calendar
                </a>
              </Button>
              <Button className="w-full" onClick={goToMessages}>
                <MessageSquare className="h-4 w-4" />
                Message {service.providerName}
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        )}

        {service && !done && (
          <>
            <DialogHeader>
              <DialogTitle>Book this service</DialogTitle>
              <DialogDescription>
                Pick a time and pay to confirm. You can message {service.providerName}{" "}
                right after.
              </DialogDescription>
            </DialogHeader>

            {/* Meeting summary */}
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="secondary" className="mb-1.5 text-xs">
                    {service.category}
                  </Badge>
                  <h3 className="truncate font-semibold text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    with {service.providerName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-foreground">
                    {formatPrice(service.price)}
                  </div>
                  {service.price > 0 && (
                    <div className="text-xs text-muted-foreground">per session</div>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Choose a date
              </p>
              <div className="flex flex-wrap gap-2.5">
                {dates.map((d) => (
                  <Chip key={d} active={date === d} onClick={() => selectDate(d)}>
                    {formatDate(d)}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Times — specific to the chosen date */}
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Choose a time
              </p>
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date first.</p>
              ) : times.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No times available on this date.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {times.map((t) => (
                    <Chip key={t} active={time === t} onClick={() => setTime(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Payment method</p>
              <div className="grid grid-cols-2 gap-3">
                {METHODS.map((m) => {
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "relative flex min-w-0 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {active && (
                        <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
                      )}
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {m.icon}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {m.title}
                      </span>
                      <span className="break-words text-[11px] leading-tight text-muted-foreground">
                        {m.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {method === "paypal" && paypalEnabled && service.price > 0 ? (
              <div className="space-y-2">
                {(!date || !time) && (
                  <p className="text-center text-xs text-muted-foreground">
                    Pick a date and time above to pay with PayPal.
                  </p>
                )}
                <div className={cn(!date || !time ? "pointer-events-none opacity-50" : "")}>
                  <PayPalScriptProvider
                    options={{
                      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string,
                      currency: "USD",
                      intent: "capture",
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                      forceReRender={[service.id, date, time]}
                      disabled={!date || !time || paying}
                      createOrder={async () => {
                        if (!profile) throw new Error("Not signed in");
                        const res = await fetch("/api/paypal/create-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            serviceId: service.id,
                            requesterId: profile.uid,
                            providerId: service.providerId,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.id) {
                          throw new Error(data.error ?? "Could not start PayPal checkout.");
                        }
                        return data.id as string;
                      }}
                      onApprove={async (data) => {
                        if (!profile || !date || !time) return;
                        setPaying(true);
                        setError(null);
                        try {
                          const res = await fetch("/api/paypal/capture-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              orderId: data.orderID,
                              serviceId: service.id,
                              date,
                              time,
                              requesterId: profile.uid,
                              providerId: service.providerId,
                            }),
                          });
                          const out = await res.json();
                          if (!res.ok || !out.ok) {
                            throw new Error(out.error ?? "Payment could not be confirmed.");
                          }
                          setDone(true);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Something went wrong.");
                        } finally {
                          setPaying(false);
                        }
                      }}
                      onError={() => setError("PayPal had a problem. Please try again.")}
                    />
                  </PayPalScriptProvider>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  You pay securely on PayPal. Your booking is created only after payment.
                </p>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canPay}
                  loading={paying}
                  onClick={handlePay}
                >
                  {!paying && <Lock className="h-4 w-4" />}
                  Pay now · {formatPrice(service.price)}
                </Button>

                <p className="-mt-1 text-center text-[11px] text-muted-foreground">
                  {stripeEnabled && method === "stripe" && service.price > 0
                    ? "Secure checkout via Stripe. You'll be redirected to pay."
                    : "Demo checkout — no real charge is made. Booking is confirmed instantly."}
                </p>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40"
      )}
    >
      {children}
    </button>
  );
}
