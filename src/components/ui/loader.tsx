"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The loading mark: two dots that trade places.
 *
 * A generic spinner says "something is happening"; this says whose app it is.
 * The whole thing is one element rotating 180 degrees per beat, so the two dots
 * land exactly in each other's position - a literal swap, and a single
 * compositor-only transform rather than four animated properties.
 */
export function Loader({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const dot = Math.round(size * 0.28);
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("lifeswap-loader", className)}
      style={{ width: size, height: dot }}
    >
      <span className="lifeswap-loader-dot" style={{ width: dot, height: dot }} />
      <span className="lifeswap-loader-dot alt" style={{ width: dot, height: dot }} />
    </span>
  );
}

/**
 * Full-screen loading state.
 *
 * Held back for a beat first: most loads resolve in well under 200ms, and a
 * loader that flashes up and vanishes reads as jank, not as progress. Nothing
 * is shown until the wait is long enough to be worth acknowledging.
 */
export function LoadingScreen({
  label = "Loading",
  delay = 200,
}: {
  label?: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="lifeswap-loading-screen" aria-busy="true" aria-live="polite">
      {visible && (
        <>
          <Loader />
          <span className="text-[13px] text-muted-foreground">{label}</span>
        </>
      )}
    </div>
  );
}
