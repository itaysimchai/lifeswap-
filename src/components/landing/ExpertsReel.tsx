import React from "react";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

// Sample experts for the marketing carousel — swap names/photos for real
// featured providers later. Portraits are Unsplash placeholders.
const EXPERTS = [
  {
    quote:
      "Code reviews and architecture from 8 years shipping production frontends. I'll help you ship cleaner, faster, and with confidence.",
    name: "Maya Chen",
    designation: "Software Engineering",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop",
  },
  {
    quote:
      "UX and visual critiques with prioritized, actionable fixes. Bring your product and leave with a clear plan to make it better.",
    name: "Leo Martins",
    designation: "Product Design",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    quote:
      "From zero to a working ML model — practical, hands-on, and friendly, with no heavy math prerequisites to get started.",
    name: "Aisha Rahman",
    designation: "Data Science & AI",
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1200&auto=format&fit=crop",
  },
  {
    quote:
      "Mock interviews, resume teardowns, and a concrete plan to land your next role. I've sat on both sides of the hiring table.",
    name: "Daniel Cohen",
    designation: "Career Coaching",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
  },
];

export function ExpertsReel() {
  return (
    <CircularTestimonials
      testimonials={EXPERTS}
      autoplay
      colors={{
        name: "var(--color-foreground)",
        designation: "var(--color-primary)",
        testimony: "var(--color-foreground)",
        arrowBackground: "var(--color-primary)",
        arrowForeground: "var(--color-primary-foreground)",
        arrowHoverBackground: "var(--color-foreground)",
      }}
      fontSizes={{ name: "2.1rem", designation: "0.8rem", quote: "1.4rem" }}
    />
  );
}
