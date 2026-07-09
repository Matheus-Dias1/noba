"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ClientContact {
  id: number;
  clientUnitId: number;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
}

export interface ClientUnit {
  id: number;
  clientId: number;
  name: string;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  complement: string | null;
  archived: boolean;
  contacts: ClientContact[];
}

export interface Client {
  id: number;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  archived: boolean;
  createdAt: string;
  units: ClientUnit[];
}

/** useClients — all non-archived clients (with units + contacts), optional search. */
export function useClients(search: string = "") {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: () =>
      apiFetch<Client[]>(
        `/api/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
  });
}

/** useClient — single client by id. */
export function useClient(id: number | undefined) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: () => apiFetch<Client>(`/api/clients/${id}`),
    enabled: id !== undefined,
  });
}

/** useSaveClient — create (POST) or update (PUT) a client. */
export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: number;
      data: { name: string; legalName?: string; cnpj?: string };
    }) =>
      id
        ? apiFetch(`/api/clients/${id}`, { method: "PUT", body: data })
        : apiFetch("/api/clients", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** useSaveUnit — create a unit under a client. */
export function useSaveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientId: number;
      name: string;
      street?: string;
      city?: string;
      state?: string;
    }) => apiFetch("/api/client-units", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** useSaveContact — add a contact to a unit. */
export function useSaveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientUnitId: number;
      name?: string;
      role?: string;
      phone?: string;
      email?: string;
    }) => apiFetch("/api/client-contacts", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Client-unit combobox loader (for the order editor's client picker)  */
/* ------------------------------------------------------------------ */

import type { AsyncComboboxOption, LoadResult } from "@/components/shared/async-combobox";

/**
 * Loader for the client-unit AsyncCombobox. Returns flattened
 * {company} - {unit} options carrying the clientUnitId as the value.
 * Since the clients list is small (118 companies), we load all and
 * client-side-filter on search.
 */
export async function loadClientUnitOptions(
  search: string,
): Promise<LoadResult<string>> {
  const res = await apiFetch<Client[]>(
    `/api/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );
  const options: AsyncComboboxOption<string>[] = [];
  for (const c of res) {
    for (const u of c.units) {
      const label =
        u.name === "PRINCIPAL"
          ? c.name
          : `${c.name} - ${u.name}`;
      options.push({ value: String(u.id), label });
    }
  }
  return { options, hasMore: false };
}
