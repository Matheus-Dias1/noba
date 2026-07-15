"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Paginated, BatchSummary, Conversion } from "@/types";
import type { AsyncComboboxOption, LoadResult } from "@/components/shared/async-combobox";

/** Light batch (list / picker). */
export interface BatchListItem {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
}

/**
 * useBatches — paginated batch list (newest first). Used by the Batches list
 * page and as the source for the batch picker.
 */
export function useBatches(search: string) {
  return useInfiniteQuery({
    queryKey: ["batches", search],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (pageParam) params.set("afterCursor", pageParam);
      return apiFetch<Paginated<BatchListItem>>(`/api/batches?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.endCursor ?? undefined,
  });
}

/** useBatchSummary — single batch fully populated (for the details screen). */
export function useBatchSummary(id: string | undefined) {
  return useQuery({
    queryKey: ["batch-summary", id],
    queryFn: () => apiFetch<BatchSummary>(`/api/batches/summary/${id}`),
    enabled: !!id,
  });
}

/** useBatchSummaries — paginated batches with orders populated (list cards). */
export function useBatchSummaries(search: string) {
  return useInfiniteQuery({
    queryKey: ["batch-summaries", search],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (pageParam) params.set("afterCursor", pageParam);
      return apiFetch<Paginated<BatchSummary>>(`/api/batches/summary?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.endCursor ?? undefined,
  });
}

/** useCreateBatch — POST /api/batches. */
export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      apiFetch("/api/batches", { method: "POST", body: { startDate, endDate } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["batch-summaries"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Async-combobox loaders (shared by order editor + batch filter)      */
/* ------------------------------------------------------------------ */

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Batch option label, e.g. "#007  (01/01/2024 - 07/01/2024)". */
export const batchLabel = (b: { number: number; startDate: string; endDate: string }) =>
  `#${`${b.number}`.padStart(3, "0")}  (${formatDate(b.startDate)} - ${formatDate(b.endDate)})`;

/** Loader for the batch AsyncCombobox. */
export async function loadBatchOptions(
  search: string,
  cursor?: string,
): Promise<LoadResult<string>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("afterCursor", cursor);
  const res = await apiFetch<Paginated<BatchListItem>>(`/api/batches?${params}`);
  return {
    options: res.edges.map((e) => ({
      value: e.node.id,
      label: batchLabel(e.node),
    })),
    hasMore: res.pageInfo.hasNextPage,
    nextCursor: res.pageInfo.endCursor ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Product loader for the order editor's product picker                */
/* ------------------------------------------------------------------ */

export interface ProductPickerOption extends AsyncComboboxOption<string> {
  defaultMeasurementUnit: string;
  conversions: Conversion[];
  processings: { id: number; name: string }[];
}

/** Loader for the product AsyncCombobox (carries unit/conversion/processing metadata). */
export async function loadProductOptions(
  search: string,
  cursor?: string,
): Promise<LoadResult<string>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("afterCursor", cursor);
  const res = await apiFetch<Paginated<{ id: string; description: string; defaultMeasurementUnit: string; conversions: Conversion[]; processings: { id: number; name: string }[] }>>(
    `/api/products?${params}`,
  );
  return {
    options: res.edges.map((e) => ({
      value: e.node.id,
      label: e.node.description,
      defaultMeasurementUnit: e.node.defaultMeasurementUnit,
      conversions: e.node.conversions,
      processings: e.node.processings,
    })),
    hasMore: res.pageInfo.hasNextPage,
    nextCursor: res.pageInfo.endCursor ?? undefined,
  };
}
