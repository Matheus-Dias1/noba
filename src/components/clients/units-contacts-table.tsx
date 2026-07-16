"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GroupedDataTable, type DataTableGroup } from "@/components/shared/grouped-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnitDialog } from "@/components/clients/unit-dialog";
import { apiFetch } from "@/lib/api-client";
import { formatBrazilianPhone, formatCnpj } from "@/lib/brazilian-documents";
import { useDeleteUnit, type ClientContact, type ClientUnit } from "@/queries/clients";
import type { DataTableColumn } from "@/components/shared/data-table";

function formatAddress(unit: ClientUnit) {
  const street = [unit.street, unit.number].filter(Boolean).join(", ");
  const locality = [unit.neighborhood, unit.city, unit.state].filter(Boolean).join(" · ");
  return [street, unit.complement, locality].filter(Boolean).join(" — ");
}

export function UnitsContactsTable({ units, clientId }: { units: ClientUnit[]; clientId: number }) {
  const qc = useQueryClient();
  const deleteUnit = useDeleteUnit();
  const [unitDialog, setUnitDialog] = useState<{ open: boolean; unit?: ClientUnit }>({ open: false });
  const [contactDialog, setContactDialog] = useState<{ open: boolean; unitId?: number; contact?: ClientContact }>({ open: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client", clientId] });
  };
  const deleteContact = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast.success("Contato removido"); },
    onError: (error) => toast.error(`Erro ao remover contato: ${error.message}`),
  });

  const groups: DataTableGroup<ClientContact>[] = units.map((unit) => ({
    key: String(unit.id),
    label: unit.name,
    rows: unit.contacts,
  }));
  const unitByKey = new Map(units.map((unit) => [String(unit.id), unit]));
  const columns: DataTableColumn<ClientContact>[] = [
    { header: "Nome", cell: (contact) => <span className="font-medium">{contact.name || "—"}</span> },
    { header: "Cargo", cell: (contact) => contact.role || "—" },
    { header: "Telefone", cell: (contact) => contact.phone ? formatBrazilianPhone(contact.phone) : "—" },
    {
      header: "Email",
      cell: (contact) => (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{contact.email || "—"}</span>
          <span className="flex shrink-0 gap-1">
            <Button size="icon-sm" variant="ghost" aria-label={`Editar ${contact.name || "contato"}`} onClick={() => setContactDialog({ open: true, unitId: contact.clientUnitId, contact })}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Excluir ${contact.name || "contato"}`} onClick={() => {
              if (window.confirm("Excluir este contato?")) deleteContact.mutate(contact.id);
            }}>
              <Trash2 className="size-3.5" />
            </Button>
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <UnitDialog open={unitDialog.open} onOpenChange={(open) => setUnitDialog((state) => ({ ...state, open }))} unit={unitDialog.unit} clientId={clientId} />
      <ContactDialog state={contactDialog} onOpenChange={(open) => setContactDialog((state) => ({ ...state, open }))} clientId={clientId} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Unidades &amp; Contatos</h3>
        <Button size="sm" variant="outline" onClick={() => setUnitDialog({ open: true })}><Plus className="size-4" /> Adicionar unidade</Button>
      </div>
      <GroupedDataTable
        columns={columns}
        groups={groups}
        rowKey={(contact) => String(contact.id)}
        emptyText="Nenhuma unidade cadastrada."
        defaultCollapsedGroups={groups.map((group) => group.key)}
        headerPerGroup
        renderGroupHeader={(group) => {
          const unit = unitByKey.get(group.key)!;
          return (
            <div className="flex flex-1 items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span>{unit.name}</span>
                  {unit.cnpj && <Badge variant="outline" className="font-normal">{formatCnpj(unit.cnpj)}</Badge>}
                </div>
                <div className="truncate text-xs font-normal text-muted-foreground">{formatAddress(unit) || "Endereço não informado"}</div>
              </div>
              <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
                <Button size="icon-sm" variant="ghost" aria-label={`Editar ${unit.name}`} onClick={() => setUnitDialog({ open: true, unit })}><Pencil className="size-3.5" /></Button>
                <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Excluir ${unit.name}`} onClick={async () => {
                  if (!window.confirm(`Excluir a unidade ${unit.name}?`)) return;
                  try { await deleteUnit.mutateAsync({ id: unit.id, clientId }); toast.success("Unidade removida"); }
                  catch (error) { toast.error(`Erro ao remover unidade: ${error instanceof Error ? error.message : error}`); }
                }}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          );
        }}
        renderGroupFooter={(group) => (
          <div className="flex justify-center"><Button size="sm" variant="ghost" onClick={() => setContactDialog({ open: true, unitId: Number(group.key) })}><Plus className="size-4" /> Adicionar contato</Button></div>
        )}
      />
    </div>
  );
}

function ContactDialog({ state, onOpenChange, clientId }: {
  state: { open: boolean; unitId?: number; contact?: ClientContact };
  onOpenChange: (open: boolean) => void;
  clientId: number;
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {state.open && state.unitId && <ContactForm unitId={state.unitId} contact={state.contact} clientId={clientId} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({ unitId, contact, clientId, onClose }: { unitId: number; contact?: ClientContact; clientId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(contact?.name ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [phone, setPhone] = useState(formatBrazilianPhone(contact?.phone ?? ""));
  const [email, setEmail] = useState(contact?.email ?? "");
  const save = useMutation({
    mutationFn: () => apiFetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
      method: contact ? "PUT" : "POST",
      body: { ...(!contact && { clientUnitId: unitId }), name, role, phone, email },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      toast.success(contact ? "Contato atualizado" : "Contato adicionado");
      onClose();
    },
    onError: (error) => toast.error(`Erro ao salvar contato: ${error.message}`),
  });
  return <>
    <DialogHeader><DialogTitle>{contact ? "Editar contato" : "Adicionar contato"}</DialogTitle><DialogDescription>Informe os dados de contato desta unidade.</DialogDescription></DialogHeader>
    <div className="grid gap-4 py-2">
      <div className="grid gap-1.5"><Label htmlFor="contact-name">Nome</Label><Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
      <div className="grid gap-1.5"><Label htmlFor="contact-role">Cargo</Label><Input id="contact-role" value={role} onChange={(e) => setRole(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label htmlFor="contact-phone">Telefone</Label><Input id="contact-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(formatBrazilianPhone(e.target.value))} placeholder="(11) 91234-5678" /></div>
        <div className="grid gap-1.5"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
    </div>
    <DialogFooter><Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button></DialogFooter>
  </>;
}
