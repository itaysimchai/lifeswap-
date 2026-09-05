"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How does booking a session work?",
    a: "Browse the services on offer, pick a provider, choose an available date and time slot, and pay to confirm. The moment it's paid, a private chat opens so you and the provider can sort out the details.",
  },
  {
    q: "Are the providers vetted?",
    a: "Yes. Anyone who wants to offer services applies first and is reviewed and approved by our team before they can publish — so you're always booking real, approved experts.",
  },
  {
    q: "How do I become a provider?",
    a: "Apply from the Become a provider page with a short summary of your experience. Once you're approved, you can publish services, set your own availability, and start taking paid bookings.",
  },
  {
    q: "When can I message a provider?",
    a: "A private chat opens automatically once your booking is confirmed and paid. There's no messaging before that, which keeps things focused and spam-free for everyone.",
  },
  {
    q: "What does it cost?",
    a: "Browsing and signing up are free. You only pay for the sessions you book, and providers set their own prices — so you always see the cost up front before you confirm.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-background">
      <div className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            FAQ
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="text-base font-semibold text-foreground sm:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
