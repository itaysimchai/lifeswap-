import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata = { title: "Terms of Service" };

const SECTIONS = [
  {
    h: "1. Acceptance of terms",
    p: "By creating an account or using LifeSwap, you agree to these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    h: "2. Accounts",
    p: "You are responsible for the activity on your account and for keeping your credentials secure. You must provide accurate information and be at least 18 years old.",
  },
  {
    h: "3. Bookings and payments",
    p: "Booking a service confirms a session with a provider at the selected date and time. Payment confirms the booking. Pricing, refunds, and cancellations are subject to the policy shown at checkout.",
  },
  {
    h: "4. Provider responsibilities",
    p: "Providers are responsible for the services they offer, their availability, and delivering sessions as described. Providers must hold any licenses or qualifications they claim.",
  },
  {
    h: "5. Acceptable use",
    p: "Do not use LifeSwap for unlawful, fraudulent, or abusive activity. We may suspend or block accounts that violate these terms or that are the subject of valid reports.",
  },
  {
    h: "6. Limitation of liability",
    p: "LifeSwap connects users with independent providers and is not a party to the services delivered. The platform is provided “as is” without warranties to the extent permitted by law.",
  },
  {
    h: "7. Changes",
    p: "We may update these terms from time to time. Continued use after changes take effect constitutes acceptance of the updated terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container-page py-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated June 18, 2026 · This is a template and should be reviewed by
              legal counsel before launch.
            </p>

            <div className="mt-10 space-y-8">
              {SECTIONS.map((s) => (
                <section key={s.h}>
                  <h2 className="text-lg font-semibold text-foreground">{s.h}</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.p}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
