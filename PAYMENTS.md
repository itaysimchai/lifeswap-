# PayPal Payments

LifeSwap is PayPal-only for paid bookings.

## Flow

1. User picks a date/time in `BookingDialog`.
2. The browser calls `POST /api/paypal/create-order` with `{ serviceId, date, time }`
   and a Firebase ID token.
3. The server verifies the user, reads the service/provider/price from Firestore,
   validates the slot, creates a PayPal order, and stores `payments/{orderId}`.
4. PayPal approves the order in the browser.
5. The browser calls `POST /api/paypal/capture-order` with `{ orderId }`.
6. The server captures PayPal, checks the amount/currency against the stored
   payment record, locks the slot, creates the booking, opens the chat, and sends
   emails.

Free services use `POST /api/bookings/free` and go through the same server-side
slot lock and booking creation code without PayPal.

## Environment

```bash
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_WEBHOOK_ID=...
```

Use `PAYPAL_ENV=live` only with live app credentials.

## Refunds

Cancellation uses the saved PayPal capture id on the booking. The server computes
the refund policy and calls PayPal from `/api/cancel-booking`.

If a payment capture succeeds but booking creation fails, the capture route
refunds immediately and marks the payment doc as `refunded` or `needs_refund`.

## Firestore

Clients cannot create or update:

- `serviceRequests`
- `payments`
- `slotLocks`
- `mail`

`bookedSlots` is readable to signed-in users so booking UI can hide unavailable
times, but only server routes create or delete those docs.
