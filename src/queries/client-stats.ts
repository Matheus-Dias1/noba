"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ClientStats {
  totalOrders: number;
  totalItems: number;
  lastOrderDate: string | null;
  rank: number | null;
  ordersByMonth: { month: string; count: number }[];
  ordersByMonthByUnit: {
    month: string;
    unitId: number;
    unitName: string;
    count: number;
  }[];
  topProducts: { name: string; totalItems: number }[];
  ordersByUnit: { unitName: string; count: number }[];
}

export function useClientStats(clientId: number | undefined) {
  return useQuery({
    queryKey: ["client-stats", clientId],
    queryFn: () => apiFetch<ClientStats>(`/api/clients/${clientId}/stats`),
    enabled: clientId !== undefined,
  });
}
