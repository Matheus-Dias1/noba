"use client";

import { useEffect, useState } from "react";
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
import { useUpdateUnit } from "@/queries/clients";

/**
 * Unit edit dialog — edits a client unit's name and address fields.
 * Currently edit-only (units are created during client import or creation).
 */
export function UnitDialog({
  open,
  onOpenChange,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    complement: string | null;
  };
}) {
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [complement, setComplement] = useState("");
  const update = useUpdateUnit();

  // Seed form fields whenever the dialog opens
  useEffect(() => {
    if (open && unit) {
      setName(unit.name ?? "");
      setStreet(unit.street ?? "");
      setNumber(unit.number ?? "");
      setNeighborhood(unit.neighborhood ?? "");
      setCity(unit.city ?? "");
      setState(unit.state ?? "");
      setZip(unit.zip ?? "");
      setComplement(unit.complement ?? "");
    }
  }, [open, unit]);

  const handleSubmit = async () => {
    if (!unit || !name.trim()) return;
    try {
      await update.mutateAsync({
        id: unit.id,
        data: {
          name: name.trim(),
          street: street.trim() || undefined,
          number: number.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
          complement: complement.trim() || undefined,
        },
      });
      toast.success("Unidade atualizada");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        `Erro ao atualizar unidade: ${err instanceof Error ? err.message : err}`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open && (
          <>
            <DialogHeader>
              <DialogTitle>Editar unidade</DialogTitle>
              <DialogDescription>
                Atualize o nome e endereço da unidade.
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-zip">CEP</Label>
                  <Input
                    id="unit-zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
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
                onClick={() => onOpenChange(false)}
                disabled={update.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || update.isPending}
              >
                {update.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
