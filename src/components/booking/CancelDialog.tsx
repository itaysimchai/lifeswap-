"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/actions";
import { computeRefund, sessionStart } from "@/lib/cancellation";
import type { ServiceRequest } from "@/lib/types";

export function CancelDialog({
  booking,
  perspective,
  open,
  onClose,
}: {
  booking: ServiceRequest;
  perspective: "customer" | "host";
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = booking.price ?? 0;
  const cancelledByHost = perspective === "host";
  const start = sessionStart(booking.scheduledDate, booking.scheduledTime);
  const { fraction, amount } = computeRefund({ price, cancelledByHost, start });

  let refundLine: string;
  if (price <= 0) {
    refundLine = "This is a free session — there's no payment to refund.";
  } else if (cancelledByHost) {
    refundLine = `Your customer will be fully refunded $${amount.toFixed(2)}.`;
  } else if (fraction >= 1) {
    refundLine = `You'll be refunded the full $${amount.toFixed(2)}.`;
  } else {
    refundLine = `It's within 24 hours of the session, so you'll be refunded $${amount.toFixed(
      2
    )} — half the price.`;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(booking.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel the session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            {booking.serviceTitle} —{" "}
            {perspective === "customer"
              ? `with ${booking.providerName}`
              : `booked by ${booking.requesterName}`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">{refundLine}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={confirm} loading={busy}>
            Cancel session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
