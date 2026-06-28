import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { categoryArt } from "@/lib/categoryArt";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/types";

// The signature element of the home: a category-art session card. A gradient
// cover with an oversized faint category glyph, the host's avatar nudged over
// the cover's bottom edge, then title + price. Gives the Airbnb "photo-led"
// feel without photos.
function initials(name: string) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Earliest upcoming date with open slots, formatted "Thu, Jun 12" — or null. */
function nextSlot(availability?: Record<string, string[]>): string | null {
  if (!availability) return null;
  const today = new Date().toISOString().slice(0, 10);
  const dates = Object.keys(availability)
    .filter((d) => (availability[d]?.length ?? 0) > 0 && d >= today)
    .sort();
  if (dates.length === 0) return null;
  const d = new Date(`${dates[0]}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function SessionCard({ service }: { service: Service }) {
  const { gradient, Icon } = categoryArt(service.category);
  const next = nextSlot(service.availability);
  const hasPhoto = !!service.providerPhotoURL;

  return (
    <Link
      href={`/services/${service.id}`}
      className="hover-lift flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Cover */}
      <div className={cn("relative h-28 overflow-hidden bg-gradient-to-br", gradient)}>
        <Icon className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 text-white/15" />
        <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {service.category}
        </span>
      </div>

      {/* Body. With a real photo the avatar overlaps the cover edge (Airbnb-style);
          with just initials it sits fully inside the body as a clean circle. */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        <Avatar
          className={cn("h-12 w-12 ring-4 ring-card", hasPhoto ? "-mt-6" : "mt-3")}
        >
          <AvatarImage src={service.providerPhotoURL ?? undefined} alt={service.providerName} />
          <AvatarFallback>{initials(service.providerName)}</AvatarFallback>
        </Avatar>
        <p className="mt-2 text-xs text-muted-foreground">{service.providerName}</p>
        <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-foreground">
          {service.title}
        </h3>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">
            {service.price > 0 ? `$${service.price}` : "Free"}
            {service.price > 0 && (
              <span className="font-normal text-muted-foreground"> / session</span>
            )}
          </span>
          {next && <span className="text-xs text-muted-foreground">Next: {next}</span>}
        </div>
      </div>
    </Link>
  );
}
