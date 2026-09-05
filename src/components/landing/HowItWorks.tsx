import React from "react";
import { Search, CalendarCheck, MessagesSquare } from "lucide-react";
import { ContainerScroll, CardSticky } from "@/components/ui/cards-stack";

const STEPS = [
  {
    icon: Search,
    title: "Browse services",
    body: "Explore what providers offer across design, engineering, coaching, and more. Search and filter to find the right fit.",
  },
  {
    icon: CalendarCheck,
    title: "Book a time",
    body: "Found something useful? Pick an available date and slot, then pay to confirm your session — no back-and-forth approvals.",
  },
  {
    icon: MessagesSquare,
    title: "Chat & get it done",
    body: "The moment your booking is confirmed, a private chat opens so you and the provider can sort out the details.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-background">
      <div className="container-page py-20 sm:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          {/* Sticky heading */}
          <div className="md:sticky md:top-24 md:h-fit md:py-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From browsing to talking in three steps
            </h2>
            <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">
              Getting help on LifeSwap is simple. Scroll through the journey — from
              finding a provider to talking with them once your session is booked.
            </p>
          </div>

          {/* Stacking step cards */}
          <ContainerScroll className="min-h-[150vh] space-y-8 py-4">
            {STEPS.map((step, index) => (
              <CardSticky
                key={step.title}
                index={index + 6}
                incrementY={16}
                className="rounded-2xl border-2 border-primary bg-card p-8 shadow-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-4xl font-bold tracking-tight text-primary/25">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-center text-2xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </CardSticky>
            ))}
          </ContainerScroll>
        </div>
      </div>
    </section>
  );
}
