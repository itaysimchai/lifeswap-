"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// The hero's signature: a small "hand" of real experts. At rest it's a tidy
// stack; hovering the deck fans the cards apart left-to-right so each person —
// face, name, specialty, availability — can be read at a glance, then it
// re-stacks on leave. Hover-only and non-interactive by design (the hero
// buttons carry the actions).
// Portraits are Unsplash placeholders; swap for featured providers later.
type Expert = {
  name: string;
  specialty: string;
  open: string;
  src: string;
};

const EXPERTS: Expert[] = [
  {
    name: "Maya Chen",
    specialty: "Staff Frontend Engineer",
    open: "Open Thu & Fri",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=480&auto=format&fit=crop",
  },
  {
    name: "Daniel Cohen",
    specialty: "Career Coach, ex-FAANG hiring",
    open: "Open this week",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=480&auto=format&fit=crop",
  },
  {
    name: "Aisha Rahman",
    specialty: "Applied ML, no math gatekeeping",
    open: "2 slots Tue",
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=480&auto=format&fit=crop",
  },
];

// Index 0 stays on top (z 30) in both states for visual continuity. Cards keep
// their avatar on the left, so the fan exposes each card's left edge — the
// face + name stay readable even with the slight overlap.
const REST = [
  { x: 0, y: 0, scale: 1, rotate: 0, z: 30 },
  { x: 16, y: 16, scale: 0.97, rotate: 4, z: 20 },
  { x: -16, y: 30, scale: 0.94, rotate: -6, z: 10 },
] as const;

const OPEN = [
  { x: 84, y: 4, scale: 1, rotate: 7, z: 30 },
  { x: 0, y: -2, scale: 0.98, rotate: 0, z: 20 },
  { x: -84, y: 4, scale: 0.98, rotate: -7, z: 10 },
] as const;

function ExpertCard({ expert, emphasis }: { expert: Expert; emphasis: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border bg-card p-4 transition-shadow",
        emphasis
          ? "border-primary/30 shadow-2xl shadow-slate-900/10"
          : "border-border shadow-lg shadow-slate-900/5"
      )}
    >
      <div className="flex items-center gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={expert.src}
          alt={expert.name}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{expert.name}</p>
          <p className="truncate text-sm text-muted-foreground">{expert.specialty}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-signature opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-signature" />
          </span>
          {expert.open}
        </span>
      </div>
    </div>
  );
}

function DeckCard({
  expert,
  index,
  open,
  reduce,
  firstMount,
}: {
  expert: Expert;
  index: number;
  open: boolean;
  reduce: boolean;
  firstMount: boolean;
}) {
  const target = open ? OPEN[index] : REST[index];

  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ zIndex: target.z }}
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{
        opacity: 1,
        x: target.x,
        y: target.y,
        scale: target.scale,
        rotate: target.rotate,
      }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: 260,
              damping: 26,
              delay: firstMount ? (2 - index) * 0.07 : 0,
            }
      }
    >
      <ExpertCard expert={expert} emphasis={index === 0} />
    </motion.div>
  );
}

export function HeroExperts() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <div
      className="relative mx-auto h-[210px] w-full max-w-sm select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {EXPERTS.map((expert, i) => (
        <DeckCard
          key={expert.name}
          expert={expert}
          index={i}
          open={hovered}
          reduce={!!reduce}
          firstMount={!mounted.current}
        />
      ))}
    </div>
  );
}
