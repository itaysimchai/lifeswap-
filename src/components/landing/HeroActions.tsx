"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";

export function HeroActions() {
  const { user } = useAuth();
  const home = "/home";

  return (
    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:items-start lg:justify-start">
      {user ? (
        <>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={home}>
              Go to my dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">Browse services</Link>
          </Button>
        </>
      ) : (
        <>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">Browse services</Link>
          </Button>
        </>
      )}
    </div>
  );
}
