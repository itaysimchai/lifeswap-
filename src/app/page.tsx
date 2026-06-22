"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare, ShieldCheck, Wallet, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroActions } from "@/components/landing/HeroActions";
import WhisperText from "@/components/ui/whisper-text";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ExpertsReel } from "@/components/landing/ExpertsReel";
import { ProviderShowcase } from "@/components/landing/ProviderShowcase";
import { Faq } from "@/components/landing/Faq";
import { useAuth } from "@/providers/AuthProvider";
import { homePathForProfile } from "@/lib/auth";

const ASSURANCES = [
  { icon: ShieldCheck, label: "Approved providers" },
  { icon: MessagesSquare, label: "Direct messaging" },
  { icon: Wallet, label: "Free to get started" },
];

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
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent"
          />
          <div className="container-page relative">
            <div className="mx-auto max-w-4xl py-24 text-center sm:py-32">
              <WhisperText
                text="A simpler way to find and offer services"
                className="justify-center text-sm font-medium tracking-wide text-muted-foreground"
                delay={55}
                duration={0.5}
                y={12}
              />

              <h1 className="mx-auto mt-7 text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:whitespace-nowrap sm:text-4xl lg:text-5xl">
                Book an expert. Decide smarter.
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Book a session with a vetted expert, get advice from someone who&apos;s
                been there, and move forward with confidence.
              </p>

              <HeroActions />

              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                {ASSURANCES.map((a) => (
                  <span key={a.label} className="inline-flex items-center gap-2">
                    <a.icon className="h-4 w-4 text-primary" />
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <HowItWorks />

        {/* Our experts */}
        <section
          id="experts"
          className="scroll-mt-20 overflow-hidden border-t border-border py-20 sm:py-28"
        >
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Our experts
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Learn from people who&apos;ve done it
              </h2>
            </div>
          </div>

          <div className="container-page mt-14">
            <ExpertsReel />
          </div>
        </section>

        {/* Become a provider */}
        <ProviderShowcase />

        {/* FAQ */}
        <Faq />
      </main>

      <Footer />
    </div>
  );
}
