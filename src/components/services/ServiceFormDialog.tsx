"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/providers/AuthProvider";
import { createService, updateService } from "@/lib/actions";
import { serviceSchema, type ServiceFormData } from "@/lib/validations";
import { SERVICE_CATEGORIES, type Service } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// 30-minute slots from 07:00 to 21:00 for the time dropdown.
const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export function ServiceFormDialog({
  open,
  service,
  onClose,
}: {
  open: boolean;
  service: Service | null;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const isEdit = !!service;

  const [category, setCategory] = useState("");
  // date (ISO) -> time slots for that date
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({ resolver: zodResolver(serviceSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      title: service?.title ?? "",
      description: service?.description ?? "",
      price: service?.price ?? 0,
      linkedin: service?.providerLinkedin ?? "",
    });
    setCategory(service?.category ?? "");
    setAvailability(service?.availability ?? {});
    setError(null);
  }, [open, service, reset]);

  const dates = Object.keys(availability).sort();

  function toggleDate(d: string) {
    setAvailability((prev) => {
      const next = { ...prev };
      if (next[d]) delete next[d];
      else next[d] = [];
      return next;
    });
  }
  function addTime(date: string, t: string) {
    setAvailability((prev) => {
      const cur = prev[date] ?? [];
      if (cur.includes(t)) return prev;
      return { ...prev, [date]: [...cur, t].sort() };
    });
  }
  function removeTime(date: string, t: string) {
    setAvailability((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).filter((x) => x !== t),
    }));
  }

  async function onSubmit(data: ServiceFormData) {
    if (!profile) return;
    if (!category) {
      setError("Please choose a category.");
      return;
    }
    // Drop any selected dates that have no time slots.
    const cleaned = Object.fromEntries(
      Object.entries(availability).filter(([, times]) => times.length > 0)
    );
    setError(null);
    const input = {
      title: data.title,
      description: data.description,
      category,
      price: Number(data.price) || 0,
      linkedin: data.linkedin,
      availability: cleaned,
    };
    try {
      if (isEdit && service) await updateService(service.id, input);
      else await createService(profile, input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the service.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-5 p-7 sm:max-w-lg sm:p-8">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            Describe what you offer, set a price, and add the times you&apos;re available
            on each date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. React & Next.js code review"
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                error={errors.price?.message}
                {...register("price", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Use 0 for a free session.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will the client get? Who is it for?"
              className="min-h-[120px]"
              error={errors.description?.message}
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn (optional)</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/you"
              error={errors.linkedin?.message}
              {...register("linkedin")}
            />
            <p className="text-xs text-muted-foreground">
              Shown as a small link on your service card when provided.
            </p>
          </div>

          {/* Availability: pick dates, then set each date's own time slots */}
          <div className="space-y-2">
            <Label>Availability</Label>
            <p className="text-xs text-muted-foreground">
              Tap the days you&apos;re available, then add time slots for each one.
            </p>
            <Calendar selected={dates} onToggle={toggleDate} />
          </div>

          {dates.length > 0 && (
            <div className="space-y-3">
              {dates.map((date) => {
                const slots = availability[date] ?? [];
                return (
                  <div key={date} className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate(date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleDate(date)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove date
                      </button>
                    </div>

                    <Select value="" onValueChange={(t) => addTime(date, t)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Add a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.filter((t) => !slots.includes(t)).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {slots.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {slots.map((t) => (
                          <Badge key={t} variant="secondary" className="gap-1 pr-1.5">
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTime(date, t)}
                              className="rounded-full p-0.5 hover:text-destructive"
                              aria-label={`Remove ${t}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No time slots yet for this date.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Save changes" : "Publish service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
