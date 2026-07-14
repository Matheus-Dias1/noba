"use client";

import { useState } from "react";
import { Plus, Search, Building2, MapPin, Phone, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useClients, type Client } from "@/queries/clients";
import { ClientDialog } from "@/components/clients/client-dialog";
import { cn } from "@/lib/utils";

/**
 * Clients management page — lists companies as expandable accordions. Each
 * client shows its units (with address) and contacts. Create new clients via
 * the dialog.
 *
 * (Editing units/contacts inline + contacts CRUD UI arrive in a follow-up; this
 * page is read-dominant — the imported clients/units are the main content.)
 */
export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { data: clients, status, isFetching } = useClients(search);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* header + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Empresas, unidades de entrega e contatos
          </p>
        </div>
        <Button size="icon-lg" onClick={() => setDialogOpen(true)} aria-label="Novo cliente">
          <Plus className="size-5" />
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente"
          className="pl-8"
        />
      </div>

      {/* list */}
      {status === "pending" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !clients || clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isFetching ? "Carregando..." : "Nenhum cliente encontrado."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              open={expanded.has(client.id)}
              onToggle={() => toggle(client.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientRow({
  client,
  open,
  onToggle,
}: {
  client: Client;
  open: boolean;
  onToggle: () => void;
}) {
  const unitCount = client.units.length;
  const contactCount = client.units.reduce((s, u) => s + u.contacts.length, 0);

  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40" />
          }
        >
            <Building2 className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium">{client.name}</h3>
              {client.cnpj && (
                <p className="text-xs text-muted-foreground">CNPJ: {client.cnpj}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {unitCount} {unitCount === 1 ? "unidade" : "unidades"}
              </Badge>
              {contactCount > 0 && (
                <Badge variant="outline" className="font-normal">
                  {contactCount} {contactCount === 1 ? "contato" : "contatos"}
                </Badge>
              )}
              <Link
                href={`/clients/${client.id}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                onClick={(e) => e.stopPropagation()}
              >
                Ver detalhes →
              </Link>
              <ChevronDown
                className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
              />
            </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-3 border-t p-4">
            {client.units.map((unit) => {
              const addr = [unit.street, unit.number, unit.neighborhood, unit.city, unit.state]
                .filter(Boolean)
                .join(", ");
              return (
                <div key={unit.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="font-medium">{unit.name}</span>
                  </div>
                  {addr && <p className="ml-6 text-sm text-muted-foreground">{addr}</p>}
                  {unit.contacts.length > 0 && (
                    <div className="ml-6 mt-2 flex flex-col gap-1">
                      {unit.contacts.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-sm">
                          <Phone className="size-3.5 text-muted-foreground" />
                          <span>
                            {c.name || "—"}
                            {c.role && <span className="text-muted-foreground"> · {c.role}</span>}
                            {c.phone && <span className="text-muted-foreground"> · {c.phone}</span>}
                            {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {unitCount === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
