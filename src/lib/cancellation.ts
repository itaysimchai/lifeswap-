// Cancellation policy — the single source of truth, shared by the client (to
// show the refund before confirming) and the server (to enforce it).
//
//   • Free session (price 0)        → no refund (no money moved)
//   • Host cancels (any time)       → 100% refund to the customer
//   • Customer cancels ≥ 24h before → 100% refund
//   • Customer cancels < 24h before → 50% refund

/** Parse a booking's date ("yyyy-mm-dd") + time ("HH:mm") into a Date, or null. */
export function sessionStart(date?: string, time?: string): Date | null {
  if (!date) return null;
  const d = new Date(`${date}T${time ?? "00:00"}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fraction (0–1) of the price to refund. */
export function refundFraction(opts: {
  price: number;
  cancelledByHost: boolean;
  hoursUntil: number;
}): number {
  if (opts.price <= 0) return 0;
  if (opts.cancelledByHost) return 1;
  return opts.hoursUntil >= 24 ? 1 : 0.5;
}

/** Convenience: compute the refund amount in dollars for a booking. */
export function computeRefund(opts: {
  price: number;
  cancelledByHost: boolean;
  start: Date | null;
  now?: number;
}): { fraction: number; amount: number } {
  const now = opts.now ?? Date.now();
  const hoursUntil = opts.start ? (opts.start.getTime() - now) / 3_600_000 : 0;
  const fraction = refundFraction({
    price: opts.price,
    cancelledByHost: opts.cancelledByHost,
    hoursUntil,
  });
  return { fraction, amount: Math.round(opts.price * fraction * 100) / 100 };
}
