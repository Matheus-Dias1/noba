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
import { useSaveUnit, useUpdateUnit } from "@/queries/clients";
import { formatCep, formatCnpj, isValidCnpj } from "@/lib/brazilian-documents";

/**
 * Unit dialog — creates or edits a client unit and its complete address.
 */
export function UnitDialog({
  open,
  onOpenChange,
  unit,
  clientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: {
    id: number;
    name: string;
    cnpj: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    complement: string | null;
  };
  clientId?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open && (unit || clientId) && (
          <UnitDialogForm
            unit={unit}
            clientId={clientId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type EditableUnit = NonNullable<Parameters<typeof UnitDialog>[0]["unit"]>;

function UnitDialogForm({ unit, clientId, onClose }: { unit?: EditableUnit; clientId?: number; onClose: () => void }) {
  const [name, setName] = useState(unit?.name ?? "");
  const [cnpj, setCnpj] = useState(formatCnpj(unit?.cnpj ?? ""));
  const [street, setStreet] = useState(unit?.street ?? "");
  const [number, setNumber] = useState(unit?.number ?? "");
  const [neighborhood, setNeighborhood] = useState(unit?.neighborhood ?? "");
  const [city, setCity] = useState(unit?.city ?? "");
  const [state, setState] = useState(unit?.state ?? "");
  const [zip, setZip] = useState(formatCep(unit?.zip ?? ""));
  const [complement, setComplement] = useState(unit?.complement ?? "");
  const update = useUpdateUnit();
  const create = useSaveUnit();
  const cnpjValid = isValidCnpj(cnpj);

  const handleSubmit = async () => {
    if (!name.trim() || !cnpjValid) return;
    try {
      const data = {
          name: name.trim(),
          cnpj: cnpj.trim(),
          street: street.trim() || undefined,
          number: number.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
          complement: complement.trim() || undefined,
      };
      if (unit) {
        await update.mutateAsync({ id: unit.id, data });
      } else if (clientId) {
        await create.mutateAsync({ clientId, ...data });
      }
      toast.success(unit ? "Unidade atualizada" : "Unidade adicionada");
      onClose();
    } catch (err) {
      toast.error(
        `Erro ao salvar unidade: ${err instanceof Error ? err.message : err}`,
      );
    }
  };

  return (
    <>
            <DialogHeader>
              <DialogTitle>{unit ? "Editar unidade" : "Adicionar unidade"}</DialogTitle>
              <DialogDescription>
                {unit ? "Atualize o nome e endereço da unidade." : "Informe os dados da nova unidade."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="unit-name">Nome *</Label>
                <Input
                  id="unit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="SEDE"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit-cnpj">CNPJ *</Label>
                <Input
                  id="unit-cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0001-00"
                  aria-invalid={cnpj.length > 0 && !cnpjValid}
                />
                {cnpj.length > 0 && !cnpjValid && (
                  <p className="text-xs text-destructive">CNPJ inválido.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-zip">CEP</Label>
                  <Input
                    id="unit-zip"
                    value={zip}
                    onChange={(e) => setZip(formatCep(e.target.value))}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-state">Estado</Label>
                  <Input
                    id="unit-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit-street">Logradouro</Label>
                <Input
                  id="unit-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua das Flores"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-number">Número</Label>
                  <Input
                    id="unit-number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-neighborhood">Bairro</Label>
                  <Input
                    id="unit-neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Centro"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit-city">Cidade</Label>
                <Input
                  id="unit-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit-complement">Complemento</Label>
                <Input
                  id="unit-complement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Galpão 2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={update.isPending || create.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !cnpjValid || update.isPending || create.isPending}
              >
                {(update.isPending || create.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
    </>
  );
}
