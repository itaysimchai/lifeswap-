import React from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <header className="p-6">
          <Link href="/" className="flex w-fit items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">LifeSwap</span>
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center p-6">{children}</main>
      </div>
    </div>
  );
}
