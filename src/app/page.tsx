"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroActions } from "@/components/landing/HeroActions";
import { HeroFlip } from "@/components/landing/HeroFlip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeaturedExperts } from "@/components/landing/FeaturedExperts";
import { ProviderShowcase } from "@/components/landing/ProviderShowcase";
import { Faq } from "@/components/landing/Faq";
import { useAuth } from "@/providers/AuthProvider";
import { homePathForProfile } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // Signed-in visitors skip the marketing hero and go straight into the app.
  useEffect(() => {
    if (!loading && user) router.replace(homePathForProfile(profile));
  }, [loading, user, profile, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero — the experts lead the page. Copy on the left, a "hand" of real,
            bookable experts on the right as the signature element. */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-24 h-[440px] w-[440px] rounded-full bg-primary/[0.06] blur-3xl"
          />
          <div className="container-page relative">
            <div className="grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
              {/* Left: the pitch */}
              <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-signature">
                  Advice from people who&apos;ve done it
                </p>

                <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl lg:text-[3.5rem]">
                  Book an{" "}
                  <span className="underline decoration-signature decoration-[3px] underline-offset-[7px]">
                    expert
                  </span>
                  .<br className="hidden sm:block" /> Decide smarter.
                </h1>

                <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                  Sit down with someone who&apos;s already been where you&apos;re
                  headed. Pick a time, pay once, and the conversation opens the
                  moment it&apos;s booked.
                </p>

                <HeroActions />

                <p className="mt-9 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  Every expert is application-reviewed before they can take a booking.
                </p>
              </div>

              {/* Right: experts deck that flips to a live flow demo on click */}
              <div className="relative">
                <HeroFlip />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <HowItWorks />

        {/* Our experts — four featured people: their careers + how they help */}
        <FeaturedExperts />

        {/* Become a provider */}
        <ProviderShowcase />

        {/* FAQ */}
        <Faq />
      </main>

      <Footer />
    </div>
  );
}
