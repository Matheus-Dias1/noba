"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Paginated, Product } from "@/types";

/** Shape returned by the list endpoint (mongoose doc, `id` set by toJSON transform). */
type ProductNode = Product;

/**
 * useProducts — paginated, searchable product list (matches the original
 * react-query `useInfiniteQuery` against /products).
 */
export function useProducts(search: string) {
  return useInfiniteQuery({
    queryKey: ["products", search],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (pageParam) params.set("afterCursor", pageParam);
      return apiFetch<Paginated<ProductNode>>(`/api/products?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.endCursor ?? undefined,
  });
}

/** useProduct — single product by id (for the editor in edit mode). */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => apiFetch<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

type ProductInput = {
  description: string;
  defaultMeasurementUnit: string;
  conversions: Product["conversions"];
};

/** useSaveProduct — create (POST) or update (PUT) a product. */
export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ProductInput }) =>
      id
        ? apiFetch(`/api/products/${id}`, { method: "PUT", body: data })
        : apiFetch("/api/products", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
