"use client";

import { useState } from "react";
import { Plus, Truck, Phone, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSuppliers, useSaveSupplier, useDeleteSupplier } from "@/queries/suppliers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Suppliers management page — list + create + delete.
 * Product linking arrives in a follow-up (the product editor can show which
 * suppliers carry each product). This page is the supplier directory.
 */
export default function SuppliersPage() {
  const { data: suppliers, status } = useSuppliers();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* header + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Cadastro de fornecedores</p>
        </div>
        <Button size="icon-lg" onClick={() => setDialogOpen(true)} aria-label="Novo fornecedor">
          <Plus className="size-5" />
        </Button>
      </div>

      {/* list */}
      {status === "pending" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !suppliers || suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierCard({ supplier }: { supplier: { id: number; name: string; cnpj: string | null; phone: string | null; email: string | null; productIds: number[] } }) {
  const del = useDeleteSupplier();
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="size-5 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="font-medium">{supplier.name}</h3>
            {supplier.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {supplier.cnpj}</p>}
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            del.mutate(supplier.id, {
              onSuccess: () => toast.success("Fornecedor removido"),
              onError: (e) => toast.error(`Erro: ${e.message}`),
            });
          }}
          aria-label={`Remover ${supplier.name}`}
        >
          {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
        {supplier.phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5" /> {supplier.phone}
          </span>
        )}
        {supplier.email && (
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5" /> {supplier.email}
          </span>
        )}
      </div>
      {supplier.productIds.length > 0 && (
        <div className="mt-2">
          <Badge variant="secondary" className="font-normal">
            {supplier.productIds.length} {supplier.productIds.length === 1 ? "produto" : "produtos"}
          </Badge>
        </div>
      )}
    </Card>
  );
}

function SupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const save = useSaveSupplier();

  const reset = () => {
    setName("");
    setCnpj("");
    setPhone("");
    setEmail("");
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await save.mutateAsync({
        data: {
          name: name.trim(),
          cnpj: cnpj.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      toast.success("Fornecedor criado");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        {open && (
          <>
            <DialogHeader>
              <DialogTitle>Novo fornecedor</DialogTitle>
              <DialogDescription>Empresa fornecedora de produtos.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="sup-name">Nome *</Label>
                <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="NOME DO FORNECEDOR" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-cnpj">CNPJ</Label>
                <Input id="sup-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sup-phone">Telefone</Label>
                  <Input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(34) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-email">Email</Label>
                  <Input id="sup-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@..." />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={!name.trim() || save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
