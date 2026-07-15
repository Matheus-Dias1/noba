"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ContactEntry {
  id: number;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
}

interface EditingState {
  id: number | null; // null = adding new
  name: string;
  role: string;
  phone: string;
  email: string;
}

/**
 * Reusable contacts manager — used on both client unit and supplier detail pages.
 *
 * Shows existing contacts as read-only rows with edit/delete, plus an "add" row
 * that becomes editable inline. Persists via the unified /api/contacts endpoint.
 *
 * `owner` determines whether contacts are linked to a client unit or supplier:
 *   { type: "clientUnit", id: 123 }  or  { type: "supplier", id: 456 }
 */
export function ContactsManager({
  contacts,
  owner,
  detailQueryKey,
}: {
  contacts: ContactEntry[];
  owner:
    | { type: "clientUnit"; id: number }
    | { type: "supplier"; id: number };
  /** Extra query key to invalidate on mutation (e.g. ["client", 42]) */
  detailQueryKey?: readonly unknown[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditingState | null>(null);

  const ownerKey =
    owner.type === "clientUnit"
      ? { clientUnitId: owner.id }
      : { supplierId: owner.id };

  const saveMutation = useMutation({
    mutationFn: async (data: EditingState) => {
      const body = {
        ...ownerKey,
        name: data.name || undefined,
        role: data.role || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
      };
      if (data.id) {
        await apiFetch(`/api/contacts/${data.id}`, { method: "PUT", body: { name: data.name, role: data.role, phone: data.phone, email: data.email } });
      } else {
        await apiFetch("/api/contacts", { method: "POST", body });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      if (detailQueryKey) qc.invalidateQueries({ queryKey: detailQueryKey });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      if (detailQueryKey) qc.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  const startAdd = () =>
    setEditing({ id: null, name: "", role: "", phone: "", email: "" });
  const startEdit = (c: ContactEntry) =>
    setEditing({ id: c.id, name: c.name ?? "", role: c.role ?? "", phone: c.phone ?? "", email: c.email ?? "" });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    await saveMutation.mutateAsync(editing);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contatos
        </h3>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            <Plus className="size-4" /> Adicionar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* existing contacts */}
        {contacts.map((c) =>
          editing?.id === c.id ? (
            <ContactEditRow
              key={c.id}
              state={editing}
              set={setEditing}
              onSave={save}
              onCancel={cancel}
              saving={saveMutation.isPending}
            />
          ) : (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
            >
              <div className="min-w-0">
                <span className="font-medium">{c.name || "—"}</span>
                {c.role && (
                  <span className="text-muted-foreground"> · {c.role}</span>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" /> {c.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => startEdit(c)} aria-label="Editar contato">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(c.id)}
                  aria-label="Remover contato"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ),
        )}

        {/* add row (only when adding, not editing an existing) */}
        {editing?.id === null && (
          <ContactEditRow
            state={editing}
            set={setEditing}
            onSave={save}
            onCancel={cancel}
            saving={saveMutation.isPending}
          />
        )}

        {contacts.length === 0 && !editing && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Nenhum contato.
          </p>
        )}
      </div>
    </Card>
  );
}

/** Inline editing row (shared for add + edit). */
function ContactEditRow({
  state,
  set,
  onSave,
  onCancel,
  saving,
}: {
  state: EditingState;
  set: (s: EditingState | null) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Nome"
          value={state.name}
          onChange={(e) => set({ ...state, name: e.target.value })}
        />
        <Input
          placeholder="Cargo"
          value={state.role}
          onChange={(e) => set({ ...state, role: e.target.value })}
        />
        <Input
          placeholder="Telefone"
          value={state.phone}
          onChange={(e) => set({ ...state, phone: e.target.value })}
        />
        <Input
          placeholder="Email"
          value={state.email}
          onChange={(e) => set({ ...state, email: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="size-4" /> Cancelar
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Check className="size-4" /> Salvar
        </Button>
      </div>
    </div>
  );
}
