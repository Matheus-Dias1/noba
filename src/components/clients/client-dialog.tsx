"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSaveClient } from "@/queries/clients";

/**
 * Client dialog — create or edit a company (name, CNPJ, legal name).
 * Pass `client` to open in edit mode (prefilled, submits PUT). Units are
 * managed separately from the client detail page.
 */
export function ClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: { id: number; name: string; cnpj: string | null; legalName: string | null };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && <ClientDialogForm client={client} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ClientDialogForm({
  client,
  onClose,
}: {
  client?: { id: number; name: string; cnpj: string | null; legalName: string | null };
  onClose: () => void;
}) {
  const isEdit = !!client;
  const [name, setName] = useState(client?.name ?? "");
  const [cnpj, setCnpj] = useState(client?.cnpj ?? "");
  const [legalName, setLegalName] = useState(client?.legalName ?? "");
  const save = useSaveClient();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await save.mutateAsync({
        id: client?.id,
        data: {
          name: name.trim(),
          cnpj: cnpj.trim() || undefined,
          legalName: legalName.trim() || undefined,
        },
      });
      toast.success(isEdit ? "Cliente atualizado" : "Cliente criado");
      onClose();
    } catch (err) {
      toast.error(
        `Erro ao ${isEdit ? "atualizar" : "criar"} cliente: ${err instanceof Error ? err.message : err}`,
      );
    }
  };

  return (
    <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Atualize os dados da empresa."
                  : "Empresa ou organização compradora."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="EMPRESA EXEMPLO"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-cnpj">CNPJ</Label>
                <Input
                  id="client-cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-legal">Razão social</Label>
                <Input
                  id="client-legal"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="EMPRESA EXEMPLO LTDA."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={save.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!name.trim() || save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
    </>
  );
}
