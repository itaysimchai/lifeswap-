"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  User,
  Briefcase,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  // Hosts lead with their dashboard; browsing services stays available, just lower.
  const items = profile?.isProvider
    ? [
        { href: "/my-dashboard", label: "My Dashboard", icon: CalendarDays },
        { href: "/my-services", label: "My Services", icon: Briefcase },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard", label: "Browse services", icon: LayoutDashboard },
        { href: "/profile", label: "Profile & Settings", icon: User },
      ]
    : [
        { href: "/dashboard", label: "Browse services", icon: LayoutDashboard },
        { href: "/my-dashboard", label: "My Dashboard", icon: CalendarDays },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/become-provider", label: "Become a Provider", icon: UserPlus },
        { href: "/profile", label: "Profile & Settings", icon: User },
      ];

  return (
    <aside className={cn("w-60 shrink-0", className)}>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
