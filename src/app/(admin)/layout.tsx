import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="container-page flex flex-1 gap-8 py-8">
          <AdminSidebar className="hidden lg:block" />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
