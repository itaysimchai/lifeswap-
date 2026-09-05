import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata = { title: "Privacy Policy" };

const SECTIONS = [
  {
    h: "1. Information we collect",
    p: "We collect the information you provide — such as your name, email, profile details, services, bookings, and messages — as well as basic technical data needed to operate the service.",
  },
  {
    h: "2. How we use information",
    p: "We use your information to provide the platform: authentication, browsing and booking services, messaging, sending booking confirmations, and keeping the community safe.",
  },
  {
    h: "3. Sharing",
    p: "Limited profile and booking details are shared with the other party of a booking so a session can take place. We do not sell your personal information.",
  },
  {
    h: "4. Emails",
    p: "We send transactional emails such as booking confirmations and account notices. These are necessary to provide the service you requested.",
  },
  {
    h: "5. Data retention and security",
    p: "We keep your data for as long as your account is active and apply reasonable measures to protect it. No system is perfectly secure, so we cannot guarantee absolute security.",
  },
  {
    h: "6. Your choices",
    p: "You can update your profile, review your bookings, and request account deletion. Some records may be retained where required for legal or safety reasons.",
  },
  {
    h: "7. Contact",
    p: "For privacy questions or requests, contact the LifeSwap team through the support channel listed in the app.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container-page py-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Privacy Policy
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
