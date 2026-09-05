"use client";

import { useApplications } from "./useApplications";
import { useServices } from "./useServices";
import { useUsers } from "./useUsers";

export interface AdminStats {
  totalUsers: number;
  providers: number;
  activeServices: number;
  pendingApplications: number;
}

/** Live platform counts for the admin overview, composed from the list hooks. */
export function useAdminStats() {
  const { data: users, loading: usersLoading } = useUsers();
  const { data: services, loading: servicesLoading } = useServices();
  const { data: applications, loading: appsLoading } = useApplications();

  const stats: AdminStats = {
    totalUsers: users.length,
    providers: users.filter((u) => u.isProvider).length,
    activeServices: services.length,
    pendingApplications: applications.filter((a) => a.status === "pending")
      .length,
  };

  return {
    stats,
    loading: usersLoading || servicesLoading || appsLoading,
  };
}
