"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search,
  CalendarCheck,
  Calendar,
  Clock,
  CreditCard,
  Wallet,
  Lock,
  Loader2,
  CheckCircle2,
  Check,
  Send,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// A self-contained, looping "demo reel" rebuilt from the real LifeSwap screens
// (dashboard ServiceRow, BookingDialog, messages chat) using the same tokens and
// components — so it *is* the product, not an AI clip. Mock data only; no
// Firebase, no routing. Reduced motion parks on the final "message received"
// frame instead of animating.

type Scene = "browse" | "book" | "chat";

// Each frame = a scene + a sub-step + how long to hold it (ms). ~15s total.
const FRAMES: { scene: Scene; s: number; d: number }[] = [
  { scene: "browse", s: 0, d: 1700 }, // search + result appears
  { scene: "browse", s: 1, d: 1100 }, // tap "Book now"
  { scene: "book", s: 0, d: 1200 }, // tap the date
  { scene: "book", s: 1, d: 1000 }, // tap the time
  { scene: "book", s: 2, d: 1000 }, // tap the Card method
  { scene: "book", s: 3, d: 1100 }, // tap "Pay now"
  { scene: "book", s: 4, d: 1100 }, // paying (spinner)
  { scene: "book", s: 5, d: 1600 }, // confirmed
  { scene: "chat", s: 0, d: 1300 }, // chat opens, provider typing
  { scene: "chat", s: 1, d: 2000 }, // meeting-link message arrives
  { scene: "chat", s: 2, d: 1900 }, // reply + hold, then loop
];

export function FlowDemo() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setI((p) => (p + 1) % FRAMES.length), FRAMES[i].d);
    return () => clearTimeout(id);
  }, [i, reduce]);

  // Reduced motion: hold the payoff frame (message with the link).
  const frame = reduce ? { scene: "chat" as Scene, s: 1 } : FRAMES[i];

  return (
    <div className="mx-auto w-full max-w-md select-none">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-slate-900/10">
        <div className="relative h-[460px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={frame.scene}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              {frame.scene === "browse" && <BrowseScene s={frame.s} />}
              {frame.scene === "book" && <BookScene s={frame.s} />}
              {frame.scene === "chat" && <ChatScene s={frame.s} reduce={!!reduce} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <StepDots scene={frame.scene} />
      </div>
    </div>
  );
}

function StepDots({ scene }: { scene: Scene }) {
  const order: Scene[] = ["browse", "book", "chat"];
  const labels: Record<Scene, string> = {
    browse: "Browse",
    book: "Book",
    chat: "Message",
  };
  return (
    <div className="flex items-center justify-center gap-4 border-t border-border py-2.5">
      {order.map((sc) => (
        <span
          key={sc}
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors",
            scene === sc ? "text-primary" : "text-muted-foreground/50"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              scene === sc ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
          {labels[sc]}
        </span>
      ))}
    </div>
  );
}

// A clear, noticeable "tap": a white cursor centered on the parent control with a
// ripple pulsing out from the middle. The parent must be `relative`.
function PressCursor() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <motion.span
        className="absolute h-14 w-14 rounded-full bg-primary/30"
        animate={{ scale: [0.4, 1.8], opacity: [0.55, 0] }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "easeOut" }}
      />
      <motion.span
        className="relative drop-shadow-lg"
        animate={{ y: [0, 4, 0], scale: [1, 0.85, 1] }}
        transition={{ repeat: Infinity, duration: 0.9 }}
      >
        <MousePointer2 className="h-7 w-7 fill-white text-foreground" strokeWidth={1.75} />
      </motion.span>
    </span>
  );
}

// A button that "presses" (scales) while it's the active tap target.
function PressButton({
  pressing,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pressing: boolean }) {
  return (
    <motion.div
      animate={pressing ? { scale: [1, 0.94, 1] } : { scale: 1 }}
      transition={pressing ? { repeat: Infinity, duration: 0.9 } : { duration: 0.2 }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}

function BrowseScene({ s }: { s: number }) {
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="flex h-11 items-center rounded-lg border border-border bg-card pl-9 pr-3 text-sm">
          <span className="text-foreground">Product Manager</span>
          <motion.span
            className="ml-0.5 inline-block h-4 w-px bg-foreground"
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>DC</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">Daniel Cohen</p>
            <p className="text-xs text-muted-foreground">Provider</p>
          </div>
        </div>

        <div className="mt-3">
          <Badge variant="secondary" className="text-xs">
            Career Coaching
          </Badge>
          <h3 className="mt-2 font-semibold leading-snug text-foreground">
            Break into Product Management
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Mock interviews, a resume teardown, and a concrete plan to land your
            first PM role.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            <span className="text-lg font-bold text-foreground">$45</span>
            <span className="text-xs text-muted-foreground"> / session</span>
          </div>
          <div className="relative">
            <PressButton
              pressing={s === 1}
              size="sm"
              className={cn(s === 1 && "ring-2 ring-primary/50")}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Book now
            </PressButton>
            {s === 1 && <PressCursor />}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoChip({
  active,
  cursor,
  children,
}: {
  active: boolean;
  cursor?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground"
        )}
      >
        {children}
      </span>
      {cursor && <PressCursor />}
    </span>
  );
}

function BookScene({ s }: { s: number }) {
  if (s === 5) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success"
        >
          <CheckCircle2 className="h-8 w-8" />
        </motion.div>
        <div>
          <p className="text-lg font-semibold text-foreground">Booking confirmed</p>
          <p className="text-sm text-muted-foreground">Break into Product Management</p>
          <p className="text-sm text-muted-foreground">with Daniel Cohen</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Thu, Jun 12 · 10:30
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5 p-4">
      <div>
        <p className="font-semibold text-foreground">Book this service</p>
        <p className="text-xs text-muted-foreground">Pick a time and pay to confirm.</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Badge variant="secondary" className="mb-1 text-[10px]">
              Career Coaching
            </Badge>
            <p className="text-sm font-semibold text-foreground">
              Break into Product Management
            </p>
            <p className="text-[11px] text-muted-foreground">with Daniel Cohen</p>
          </div>
          <div className="text-right">
            <div className="font-bold text-foreground">$45</div>
            <div className="text-[10px] text-muted-foreground">per session</div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Choose a date
        </p>
        <div className="flex flex-wrap gap-2">
          {["Wed, Jun 11", "Thu, Jun 12", "Fri, Jun 13"].map((d, idx) => (
            <DemoChip key={d} active={idx === 1} cursor={s === 0 && idx === 1}>
              {d}
            </DemoChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          Choose a time
        </p>
        <div className="flex flex-wrap gap-2">
          {["09:00", "10:30", "13:00"].map((t, idx) => (
            <DemoChip key={t} active={s >= 1 && idx === 1} cursor={s === 1 && idx === 1}>
              {t}
            </DemoChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors",
              s >= 2
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                s >= 2 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <CreditCard className="h-4 w-4" />
            </span>
            <span className="font-semibold text-foreground">Card</span>
            {s >= 2 && <Check className="ml-auto h-4 w-4 text-primary" />}
          </div>
          {s === 2 && <PressCursor />}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="font-semibold text-foreground">PayPal</span>
        </div>
      </div>

      <div className="relative mt-auto">
        <PressButton pressing={s === 3} size="lg" className="w-full">
          {s === 4 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          Pay now · $45
        </PressButton>
        {s === 3 && <PressCursor />}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function ChatScene({ s, reduce }: { s: number; reduce: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-sm">DC</AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold text-foreground">Daniel Cohen</div>
          <div className="text-xs text-muted-foreground">
            Break into Product Management
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-3 p-4">
        {s === 0 ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <TypingDots />
            </div>
          </div>
        ) : (
          <>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-foreground">
                Hi Eli! Looking forward to it — here&apos;s our meeting link 🔗{" "}
                <span className="font-medium text-primary underline">
                  meet.lifeswap.app/eli-daniel
                </span>
                <div className="mt-1 text-[10px] text-muted-foreground">10:24 AM</div>
              </div>
            </motion.div>

            {s >= 2 && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Thank you! See you then 🙌
                  <div className="mt-1 text-right text-[10px] text-primary-foreground/70">
                    10:24 AM
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <div className="flex h-10 flex-1 items-center rounded-md border border-border bg-card px-3 text-sm text-muted-foreground">
            Type your message…
          </div>
          <Button size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
