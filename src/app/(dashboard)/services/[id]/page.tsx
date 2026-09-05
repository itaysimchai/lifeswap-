"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkedinIcon } from "@/components/ui/linkedin-icon";
import { useAuth } from "@/providers/AuthProvider";
import { useService } from "@/hooks/useService";
import { useOutgoingRequests } from "@/hooks/useRequests";
import { BookingDialog } from "@/components/booking/BookingDialog";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatPrice(price: number) {
  return price > 0 ? `$${price}` : "Free";
}

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { profile } = useAuth();
  const { data: service, loading } = useService(id);
  const { data: outgoing } = useOutgoingRequests(profile?.uid);
  const [bookingOpen, setBookingOpen] = useState(false);

  const booked =
    !!service &&
    outgoing.some((r) => r.serviceId === service.id && r.status === "confirmed");
  const isOwn = !!service && service.providerId === profile?.uid;

  const dateCount = service ? Object.keys(service.availability ?? {}).length : 0;
  const slotCount = service
    ? Object.values(service.availability ?? {}).reduce((n, t) => n + t.length, 0)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : !service ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            This service doesn&apos;t exist or was removed.
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to browse</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-8 p-6 sm:p-8">
            {/* Host */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {initials(service.providerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {service.providerName}
                  </p>
                  {service.providerLinkedin && (
                    <a
                      href={service.providerLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${service.providerName} on LinkedIn`}
                      title="View LinkedIn profile"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"
                    >
                      <LinkedinIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Provider</p>
              </div>
            </div>

            {/* Service */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{service.category}</Badge>
                {isOwn && <Badge variant="outline">Your service</Badge>}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                {service.title}
              </h1>
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border bg-background p-5">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatPrice(service.price)}
                </div>
                {service.price > 0 && (
                  <div className="text-xs text-muted-foreground">per session</div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {dateCount} {dateCount === 1 ? "date" : "dates"} available
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {slotCount} time {slotCount === 1 ? "slot" : "slots"}
              </div>
            </div>

            {/* Action */}
            <div>
              {isOwn ? (
                <p className="text-sm text-muted-foreground">
                  This is your own service — manage it from My Services.
                </p>
              ) : booked ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Booked
                  </Badge>
                  <Button asChild variant="outline">
                    <Link href="/messages">
                      <MessageSquare className="h-4 w-4" />
                      Message provider
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  disabled={!profile}
                  onClick={() => setBookingOpen(true)}
                >
                  <CalendarCheck className="h-4 w-4" />
                  Book this session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <BookingDialog
        service={bookingOpen && service ? service : null}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}
