"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Paginated, Conversion } from "@/types";

/** A product as nested inside an order line (list view: minimal fields). */
interface ListItemProduct {
  description: string;
  defaultMeasurementUnit: string;
}

/** A product as nested inside an order line (detail view: full fields). */
export interface DetailItemProduct {
  id: string;
  description: string;
  defaultMeasurementUnit: string;
  conversions: Conversion[];
}

/** Order line in the list. */
interface ListOrderItem {
  amount: number;
  measurementUnit: string;
  item: ListItemProduct;
}

/** Order line in the detail/editor view (product carries id + conversions). */
export interface DetailOrderItem {
  amount: number;
  measurementUnit: string;
  processingId: number | null;
  item: DetailItemProduct;
}

/** Order as returned by GET /api/orders (list). */
export interface OrderListItem {
  id: string;
  client: string;
  clientName: string | null;
  unitName: string | null;
  observation: string | null;
  createdAt: string;
  deliverAt: string;
  status: "active" | "cancelled";
  clientUnitId: number | null;
  items: ListOrderItem[];
  batch: { id: string; number: number };
}

/** Order as returned by GET /api/orders/:id (fully populated, for the editor). */
export interface OrderDetail extends Omit<OrderListItem, "items" | "batch"> {
  items: DetailOrderItem[];
  observation: string | null;
  clientUnitId: number | null;
  batch: {
    id: string;
    number: number;
    startDate: string;
    endDate: string;
  };
}

/**
 * useOrders — paginated, filterable order list (newest first).
 * Filters: `batch` (id), `client` (text), `from`/`to` (deliverAt range),
 * `product` (text), `clientUnit` (unit id). All optional.
 */
export function useOrders(filters: {
  batch?: string | null;
  client?: string;
  from?: string;
  to?: string;
  product?: string;
  clientUnit?: number | null;
  clientId?: number | null;
}) {
  return useInfiniteQuery({
    queryKey: [
      "orders",
      filters.batch ?? null,
      filters.client ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.product ?? null,
      filters.clientUnit ?? null,
      filters.clientId ?? null,
    ],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.batch) params.set("batch", filters.batch);
      if (filters.client) params.set("client", filters.client);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.product) params.set("product", filters.product);
      if (filters.clientUnit) params.set("clientUnit", String(filters.clientUnit));
      if (filters.clientId) params.set("clientId", String(filters.clientId));
      if (pageParam) params.set("afterCursor", pageParam);
      return apiFetch<Paginated<OrderListItem>>(`/api/orders?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.endCursor ?? undefined,
  });
}

/** useOrder — single order by id (for the editor in edit mode). */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch<OrderDetail>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export interface OrderInput {
  client: string;
  batch: string;
  deliverAt: string;
  items: { item: string; amount: number; measurementUnit: string; processingId?: number | null }[];
}

/** useSaveOrder — create (POST) or update (PUT) an order. */
export function useSaveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: OrderInput }) =>
      id
        ? apiFetch(`/api/orders/${id}`, { method: "PUT", body: data })
        : apiFetch("/api/orders", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
