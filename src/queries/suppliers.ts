"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface Supplier {
  id: number;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  productIds: number[];
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/api/suppliers"),
  });
}

export function useSaveSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: number;
      data: { name: string; cnpj?: string; phone?: string; email?: string };
    }) =>
      id
        ? apiFetch(`/api/suppliers/${id}`, { method: "PUT", body: data })
        : apiFetch("/api/suppliers", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}
