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
  cnpj: string | null;
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
    mutationFn: async ({
      id,
      data,
    }: {
      id?: number;
      data: {
        name: string;
        legalName?: string;
        cnpj?: string;
        units?: {
          name: string;
          cnpj?: string;
          street?: string;
          number?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
          zip?: string;
          complement?: string;
        }[];
      };
    }): Promise<{ ok: true } | { id: string }> =>
      id
        ? await apiFetch<{ ok: true }>(`/api/clients/${id}`, { method: "PUT", body: data })
        : await apiFetch<{ id: string }>("/api/clients", { method: "POST", body: data }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      if (id) qc.invalidateQueries({ queryKey: ["client", id] });
    },
  });
}

/** useSaveUnit — create a unit under a client. */
export function useSaveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientId: number;
      name: string;
      cnpj?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zip?: string;
      complement?: string;
    }) => apiFetch("/api/client-units", { method: "POST", body: data }),
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
    },
  });
}

/** useDeleteUnit — archive a client unit. */
export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId: number }) =>
      apiFetch(`/api/client-units/${id}`, { method: "DELETE" }),
    onSuccess: (_data, { clientId }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
    },
  });
}

/** useUpdateUnit — edit a unit (name + address fields). */
export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        cnpj?: string;
        street?: string;
        number?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zip?: string;
        complement?: string;
      };
    }) => apiFetch(`/api/client-units/${id}`, { method: "PUT", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client"] });
    },
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
    }) => apiFetch("/api/contacts", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Client-unit combobox loader (for the order editor's client picker)  */
/* ------------------------------------------------------------------ */

import type {
  AsyncComboboxOption,
  LoadResult,
} from "@/components/shared/async-combobox";

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
      const label = u.name === "SEDE" ? c.name : `${c.name} - ${u.name}`;
      options.push({ value: String(u.id), label });
    }
  }
  return { options, hasMore: false };
}

/** Searchable client options for dependent client/unit pickers. */
export async function loadClientOptions(
  search: string,
  cursor?: string,
): Promise<LoadResult<string>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("offset", cursor);
  return apiFetch<LoadResult<string>>(`/api/clients/options?${params}`);
}

/** Unit options scoped to one selected client. */
export async function loadUnitOptions(
  clientId: number,
  search: string,
): Promise<LoadResult<string>> {
  const client = await apiFetch<Client>(`/api/clients/${clientId}`);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  return {
    options: client.units
      .filter((unit) => !unit.archived)
      .filter((unit) =>
        normalizedSearch
          ? unit.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
          : true,
      )
      .map((unit) => ({ value: String(unit.id), label: unit.name })),
    hasMore: false,
  };
}
