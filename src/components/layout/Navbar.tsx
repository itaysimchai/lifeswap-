"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  MessageSquare,
  X,
  ArrowLeftRight,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  Home,
  Briefcase,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { homePathForProfile } from "@/lib/auth";

function initialsFrom(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const hasUnread = useUnreadMessages(user?.uid);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.displayName ?? user?.displayName ?? "";
  const isAdmin = profile?.role === "admin";
  const isProvider = !!profile?.isProvider;
  const isLanding = pathname === "/";

  // Top-bar quick links for signed-in users on the landing page (host-first order).
  const topLinks = isProvider
    ? [
        { href: "/home", label: "Home" },
        { href: "/my-services", label: "My Services" },
        { href: "/messages", label: "Messages" },
        { href: "/dashboard", label: "Browse" },
      ]
    : [
        { href: "/home", label: "Home" },
        { href: "/dashboard", label: "Browse services" },
        { href: "/messages", label: "Messages" },
      ];

  // Section anchors for logged-out visitors on the landing page.
  const sectionLinks = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#experts", label: "Experts" },
    { href: "#become-a-provider", label: "For providers" },
    { href: "#faq", label: "FAQ" },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href={user ? homePathForProfile(profile) : "/"} className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">LifeSwap</span>
            </Link>

            {user && isLanding && (
              <nav className="hidden items-center gap-1 md:flex">
                {topLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}

            {!user && isLanding && (
              <nav className="hidden items-center gap-1 md:flex">
                {sectionLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/messages" className="relative hidden sm:inline-flex">
                  <Button variant="ghost" size="icon" aria-label="Messages">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                  {hasUnread && (
                    <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.photoURL ?? user.photoURL ?? undefined} />
                        <AvatarFallback>{initialsFrom(displayName, user.email)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{displayName || "Your account"}</span>
                        <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Browse services
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/home">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/messages">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    {isProvider ? (
                      <DropdownMenuItem asChild>
                        <Link href="/my-services">
                          <Briefcase className="mr-2 h-4 w-4" />
                          My Services
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link href="/become-provider">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Become a provider
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <Settings className="mr-2 h-4 w-4" />
                        Profile &amp; settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}

            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && user && (
        <div className="border-t border-border bg-background sm:hidden">
          <div className="container-page space-y-1 py-3">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <LayoutDashboard className="h-4 w-4" /> Browse services
            </Link>
            <Link href="/home" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <Home className="h-4 w-4" /> Home
            </Link>
            <Link href="/messages" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <MessageSquare className="h-4 w-4" /> Messages
            </Link>
            {isProvider ? (
              <Link href="/my-services" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                <Briefcase className="h-4 w-4" /> My Services
              </Link>
            ) : (
              <Link href="/become-provider" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                <UserPlus className="h-4 w-4" /> Become a provider
              </Link>
            )}
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <User className="h-4 w-4" /> Profile &amp; settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
