"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useCreateBatch } from "@/queries/batches";
import { forceDateDay, padBatchNumber } from "@/lib/format";
import { toast } from "sonner";

/**
 * New Batch dialog — ported from the original `pages/Batches/NewBatch`.
 * Shows the next batch number and two date inputs (start / end). On confirm it
 * creates the batch and calls `onCreated` so the caller can react.
 *
 * The inner form is mounted only while the dialog is open, so the date fields
 * start empty every time (no reset effect needed). Note: the number shown is the
 * client's best guess (current count + 1); the server assigns the real number on
 * create (carried-over racy numbering, §10 #5).
 */
export function NewBatchDialog({
  open,
  onOpenChange,
  nextNumber,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextNumber: number;
  onCreated?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && (
          <NewBatchForm
            nextNumber={nextNumber}
            onDone={(success) => {
              if (success) {
                onOpenChange(false);
                onCreated?.();
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewBatchForm({
  nextNumber,
  onDone,
}: {
  nextNumber: number;
  onDone: (success: boolean) => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const create = useCreateBatch();

  const handleAdd = async () => {
    if (!startDate || !endDate) return;
    const start = forceDateDay(startDate).toISOString();
    const end = forceDateDay(endDate).toISOString();
    try {
      await create.mutateAsync({ startDate: start, endDate: end });
      toast.success("Lote criado");
      onDone(true);
    } catch (err) {
      toast.error(`Erro ao criar lote: ${err instanceof Error ? err.message : err}`);
    }
  };

  const valid = startDate && endDate;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lote {padBatchNumber(nextNumber)}</DialogTitle>
        <DialogDescription>Defina o período do novo lote.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="batch-start">Data inicial</Label>
          <Input
            id="batch-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batch-end">Data final</Label>
          <Input
            id="batch-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onDone(false)} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button onClick={handleAdd} disabled={!valid || create.isPending}>
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          Continuar
        </Button>
      </DialogFooter>
    </>
  );
}
