import React from "react";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_SERVICES = [
  { title: "React & Next.js review", category: "Software Engineering", status: "ACTIVE", meta: "4 booked", dot: "bg-success", statusClass: "text-success" },
  { title: "Tech career coaching", category: "Career Coaching", status: "ACTIVE", meta: "2 booked", dot: "bg-primary", statusClass: "text-success" },
  { title: "Product design critique", category: "Design", status: "PAUSED", meta: "—", dot: "bg-muted-foreground/40", statusClass: "text-muted-foreground" },
  { title: "Intro to applied ML", category: "Data Science & AI", status: "ACTIVE", meta: "1 booked", dot: "bg-warning", statusClass: "text-success" },
];

const BULLETS = [
  { k: "Services", v: "publish and manage everything you offer" },
  { k: "Availability", v: "set your own dates and time slots" },
  { k: "Bookings", v: "paid and confirmed up front — no chasing" },
  { k: "Earnings", v: "tracked by week, month, year, and lifetime" },
];

function Tab({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
      {children}
    </span>
  );
}

export function ProviderShowcase() {
  return (
    <section id="become-a-provider" className="scroll-mt-20 bg-card">
      <div className="container-page py-20 sm:py-28">
        <div className="grid items-center gap-8 rounded-3xl bg-primary/10 p-5 sm:p-8 md:grid-cols-2 lg:gap-12 lg:p-12">
          {/* Mock provider dashboard */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/10 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Provider dashboard
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Tab active>Services</Tab>
              <Tab>Bookings</Tab>
              <Tab>Earnings</Tab>
              <Tab>Profile</Tab>
            </div>
            <div className="divide-y divide-border">
              {PANEL_SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {s.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
                    <span className={s.statusClass}>{s.status}</span>
                    <span className="text-muted-foreground">{s.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copy */}
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Briefcase className="h-4 w-4" />
              Become a provider
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Your services, all in one place.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Apply once, get approved, and start offering your expertise. Publish
              services, set your availability, and get paid bookings — all from one
              simple dashboard.
            </p>
            <ul className="mt-6 space-y-2.5">
              {BULLETS.map((b) => (
                <li key={b.k} className="flex gap-2.5 text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-semibold text-foreground">{b.k}</span>, {b.v}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8">
              <Link href="/become-provider">
                Become a provider
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
