import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// "Our experts": four featured people from a mix of fields. The copy leads with
// who they are and what they've done (credibility) and how they can actually
// help you — no prices here, just the people. Portraits are Unsplash
// placeholders; the Avatar falls back to initials if an image fails to load.
type Expert = {
  name: string;
  role: string;
  field: string;
  career: string;
  help: string;
  src: string;
};

const EXPERTS: Expert[] = [
  {
    name: "Maya Chen",
    role: "Staff Frontend Engineer",
    field: "Engineering",
    career: "8 years shipping production frontends, ex-Stripe",
    help: "Reviews your architecture and code so you ship cleaner, faster, and with the confidence that it'll hold up.",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=320&auto=format&fit=crop",
  },
  {
    name: "Leo Martins",
    role: "Product Designer",
    field: "Design",
    career: "Led design at two early-stage startups",
    help: "Audits your product's UX and visuals, then hands you a prioritized list of fixes you can act on this week.",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=320&auto=format&fit=crop",
  },
  {
    name: "Daniel Cohen",
    role: "Career Coach",
    field: "Career",
    career: "Ex-FAANG, sat on both sides of the hiring table",
    help: "Runs mock interviews and resume teardowns, and leaves you with a concrete plan to land your next role.",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=320&auto=format&fit=crop",
  },
  {
    name: "Aisha Rahman",
    role: "Applied ML Engineer",
    field: "Data & AI",
    career: "Built machine-learning products end to end",
    help: "Takes you from zero to a working model — practical, hands-on, and no heavy math needed to get started.",
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=320&auto=format&fit=crop",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ExpertCard({ expert }: { expert: Expert }) {
  return (
    <Link
      href="/dashboard"
      className="hover-lift flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarImage src={expert.src} alt={expert.name} />
          <AvatarFallback>{initials(expert.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {expert.name}
          </h3>
          <p className="text-sm font-medium text-primary">{expert.role}</p>
        </div>
      </div>

      <Badge variant="secondary" className="mt-4 self-start text-xs">
        {expert.field}
      </Badge>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {expert.career}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {expert.help}
      </p>
    </Link>
  );
}

export function FeaturedExperts() {
  return (
    <section id="experts" className="scroll-mt-20 border-t border-border bg-background">
      <div className="container-page py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-signature">
            Our experts
          </p>
          <h2 className="mt-3 text-3xl text-foreground sm:text-4xl">
            Learn from people who&apos;ve done it
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Real practitioners who&apos;ve done the work and can shorten your path.
            A few of them, across the fields people ask about most.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EXPERTS.map((expert) => (
            <ExpertCard key={expert.name} expert={expert} />
          ))}
        </div>
      </div>
    </section>
  );
}
