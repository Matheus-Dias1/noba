"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/types";

type ConversionDraft = { measurementUnit: string; oneDefaultEquals: string };

export function NewProductDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (product: Product) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
    {open && <NewProductForm onCancel={() => onOpenChange(false)} onCreated={(product) => { onOpenChange(false); onCreated?.(product); }} />}
  </DialogContent></Dialog>;
}

function NewProductForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (product: Product) => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [conversions, setConversions] = useState<ConversionDraft[]>([]);
  const [conversionUnit, setConversionUnit] = useState("");
  const [factor, setFactor] = useState("");
  const [processings, setProcessings] = useState<string[]>([]);
  const [processing, setProcessing] = useState("");
  const create = useMutation({
    mutationFn: () => apiFetch<Product>("/api/products", { method: "POST", body: {
      description: description.trim(), defaultMeasurementUnit: unit.trim(),
      conversions: conversions.map((item) => ({ measurementUnit: item.measurementUnit, oneDefaultEquals: Number(item.oneDefaultEquals) })),
      processings: processings.map((name) => ({ name })),
    } }),
    onSuccess: (product) => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Produto criado"); onCreated(product); },
    onError: (error) => toast.error(`Erro ao criar produto: ${error.message}`),
  });
  const addConversion = () => {
    if (!conversionUnit.trim() || !factor || Number(factor) <= 0) return;
    setConversions((items) => [...items, { measurementUnit: conversionUnit.trim(), oneDefaultEquals: factor }]);
    setConversionUnit(""); setFactor("");
  };
  const addProcessing = () => {
    const name = processing.trim().toUpperCase();
    if (!name || processings.includes(name)) return;
    setProcessings((items) => [...items, name]); setProcessing("");
  };
  return <>
    <DialogHeader><DialogTitle>Novo produto</DialogTitle><DialogDescription>Cadastre o produto sem sair do pedido.</DialogDescription></DialogHeader>
    <div className="grid gap-4 py-2">
      <div className="grid gap-1.5"><Label htmlFor="new-product-description">Descrição</Label><Input id="new-product-description" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus /></div>
      <div className="grid gap-1.5"><Label htmlFor="new-product-unit">Unidade primária</Label><Input id="new-product-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="KG" /></div>
      <div className="grid gap-2"><Label>Conversões</Label><div className="flex gap-2"><Input value={factor} onChange={(e) => setFactor(e.target.value)} type="number" inputMode="decimal" placeholder="Fator" /><Input value={conversionUnit} onChange={(e) => setConversionUnit(e.target.value)} placeholder="Unidade" /><Button type="button" size="icon" variant="outline" onClick={addConversion}><Plus className="size-4" /></Button></div>
        {conversions.map((item, index) => <div key={`${item.measurementUnit}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>1 {unit || "un."} = {item.oneDefaultEquals} {item.measurementUnit}</span><Button size="icon-sm" variant="ghost" onClick={() => setConversions((items) => items.filter((_, i) => i !== index))}><Trash2 className="size-3.5" /></Button></div>)}
      </div>
      <div className="grid gap-2"><Label>Processamentos</Label><div className="flex gap-2"><Input value={processing} onChange={(e) => setProcessing(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProcessing(); } }} placeholder="Ex: CORTADO" /><Button type="button" size="icon" variant="outline" onClick={addProcessing}><Plus className="size-4" /></Button></div><div className="flex flex-wrap gap-1.5">{processings.map((name) => <Badge key={name} variant="secondary">{name}<button onClick={() => setProcessings((items) => items.filter((item) => item !== name))}><X className="ml-1 size-3" /></button></Badge>)}</div></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={onCancel} disabled={create.isPending}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={!description.trim() || !unit.trim() || create.isPending}>Criar produto</Button></DialogFooter>
  </>;
}
