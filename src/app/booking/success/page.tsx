import Link from "next/link";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">Booking confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session is confirmed. You can continue the conversation in messages.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button asChild className="w-full">
            <Link href="/messages">
              <MessageSquare className="h-4 w-4" />
              Go to messages
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
