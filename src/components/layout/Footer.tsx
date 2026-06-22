import React from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container-page py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">LifeSwap</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Browse services
            </Link>
            <Link href="/become-provider" className="transition-colors hover:text-foreground">
              Become a provider
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} LifeSwap. A simple marketplace for services.
        </p>
      </div>
    </footer>
  );
}
