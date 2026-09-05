"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import { HeroExperts } from "./HeroExperts";
import { FlowDemo } from "./FlowDemo";

// The hero's right side. Front = the experts deck (hover to fan it out); click it
// and the whole panel flips in 3D to reveal the live flow demo. Click the demo
// screen to flip back to the cards.
export function HeroFlip() {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md" style={{ perspective: 1600 }}>
      <motion.div
        className="relative h-[520px]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: "easeInOut" }}
      >
        {/* FRONT — experts deck */}
        <div
          className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-8 [backface-visibility:hidden] focus:outline-none"
          onClick={() => setFlipped(true)}
          role="button"
          tabIndex={flipped ? -1 : 0}
          aria-label="Watch the preview"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped(true);
            }
          }}
        >
          <HeroExperts />
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary group-focus-visible:border-primary/40">
            <Play className="h-4 w-4 fill-primary text-primary" />
            Watch the preview
          </span>
        </div>

        {/* BACK — live flow demo */}
        <div
          className="absolute inset-0 cursor-pointer [backface-visibility:hidden] [transform:rotateY(180deg)] focus:outline-none"
          onClick={() => setFlipped(false)}
          role="button"
          tabIndex={flipped ? 0 : -1}
          aria-label="Back to the experts"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped(false);
            }
          }}
        >
          <FlowDemo />
          <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-medium text-background">
            <RotateCcw className="h-3 w-3" />
            Click to go back
          </span>
        </div>
      </motion.div>
    </div>
  );
}
