"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Lightweight month calendar with multi-select. `selected` holds ISO dates
 * ("yyyy-mm-dd"); clicking a day calls `onToggle` with that date. Past dates
 * (before today, or `minDate`) are disabled.
 */
export function Calendar({
  selected,
  onToggle,
  minDate,
}: {
  selected: string[];
  onToggle: (date: string) => void;
  minDate?: string;
}) {
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const min = minDate ?? todayIso;

  const [view, setView] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const year = view.getFullYear();
  const month = view.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          disabled={atCurrentMonth}
          onClick={() => setView(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const cellIso = iso(year, month, d);
          const isSelected = selected.includes(cellIso);
          const isPast = cellIso < min;
          const isToday = cellIso === todayIso;
          return (
            <button
              key={cellIso}
              type="button"
              disabled={isPast}
              onClick={() => onToggle(cellIso)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                isPast && "cursor-not-allowed text-muted-foreground/40",
                !isPast && !isSelected && "text-foreground hover:bg-accent",
                isSelected &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                isToday && !isSelected && "ring-1 ring-inset ring-primary/40"
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
