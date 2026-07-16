"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditActions } from "@/components/shared/edit-actions";
import {
  AsyncCombobox,
  type AsyncComboboxOption,
} from "@/components/shared/async-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadBatchOptions,
  loadProductOptions,
  batchLabel,
  type ProductPickerOption,
} from "@/queries/batches";
import { loadClientOptions, loadUnitOptions } from "@/queries/clients";
import { useOrder, useSaveOrder } from "@/queries/orders";
import type { OrderDetail } from "@/queries/orders";
import { forceDateDay } from "@/lib/format";
import { NewBatchDialog } from "@/components/batches/new-batch-dialog";
import { NewProductDialog } from "@/components/products/new-product-dialog";
import { ClientDialog } from "@/components/clients/client-dialog";

/** An item row. Product is held as the combobox option (carries unit metadata). */
interface Row {
  key: string;
  product: ProductPickerOption | null;
  amount: string;
  unit: string;
  /** selected processing id (null = no processing) */
  processingId: number | null;
  /** true while this row is being added or edited inline. */
  editing: boolean;
}

interface MergeFeedback {
  sourceKey: string;
  targetKey: string;
  phase: "source-highlight" | "source-collapse" | "target";
}

type Option = AsyncComboboxOption<string>;

let rowKeySeq = 0;
const newRowKey = () => `row-${Date.now()}-${rowKeySeq++}`;

const productUnits = (product: ProductPickerOption) => [
  ...new Set([
    product.defaultMeasurementUnit,
    ...product.conversions.map((conversion) => conversion.measurementUnit),
  ]),
];

/**
 * Order editor (new + edit) — ported from the original `pages/Orders/Order`.
 *
 * Top row: client (text), batch (async picker), delivery date (date input).
 *
 * Items live in a table that is **read-only by default**. Clicking the edit
 * pencil on a row turns that single row into inline inputs (product / amount /
 * unit) until saved or cancelled. "Adicionar item" inserts one new editable
 * row. On confirm, rows sharing product+unit are merged + summed (original rule).
 */
export default function OrderEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = id === "new";
  const requestedReturn = searchParams.get("returnTo");
  const returnHref = requestedReturn && /^\/clients\/\d+$/.test(requestedReturn)
    ? requestedReturn
    : "/orders";

  const { data: order, isLoading } = useOrder(!isNew ? id : undefined);
  const saveMutation = useSaveOrder();

  if (!isNew && isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Carregando pedido...
      </div>
    );
  }

  return (
    <OrderForm
      key={id}
      isNew={isNew}
      order={order}
      submitting={saveMutation.isPending}
      cancelHref={returnHref}
      onSubmit={async (body) => {
        try {
          await saveMutation.mutateAsync({ id: isNew ? undefined : id, data: body });
          toast.success(isNew ? "Pedido criado" : "Pedido atualizado");
          router.push(returnHref);
          router.refresh();
        } catch (err) {
          toast.error(
            `Erro ao salvar pedido: ${err instanceof Error ? err.message : err}`,
          );
        }
      }}
    />
  );
}

function OrderForm({
  isNew,
  order,
  submitting,
  onSubmit,
  cancelHref,
}: {
  isNew: boolean;
  order?: OrderDetail;
  submitting: boolean;
  cancelHref: string;
  onSubmit: (body: {
    clientUnitId: number | null;
    client: string;
    observation: string;
    batch: string;
    deliverAt: string;
    items: { item: string; amount: number; measurementUnit: string }[];
  }) => Promise<void>;
}) {
  // top-row fields
  const [client, setClient] = useState<Option | null>(
    order?.clientId && order.clientName
      ? { value: String(order.clientId), label: order.clientName }
      : null,
  );
  const [clientUnit, setClientUnit] = useState<Option | null>(
    order?.clientUnitId && order.unitName
      ? { value: String(order.clientUnitId), label: order.unitName }
      : null,
  );
  const [observation, setObservation] = useState(order?.observation ?? "");
  const [batch, setBatch] = useState<Option | null>(
    order
      ? {
          value: order.batch.id,
          label: batchLabel({
            number: order.batch.number,
            startDate: order.batch.startDate,
            endDate: order.batch.endDate,
          }),
        }
      : null,
  );
  const [deliverAt, setDeliverAt] = useState(
    order ? new Date(order.deliverAt).toISOString().split("T")[0] : "",
  );
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [productDialogRow, setProductDialogRow] = useState<string | null>(null);
  const [mergeFeedback, setMergeFeedback] = useState<MergeFeedback | null>(null);
  const [mergeCollapseDuration, setMergeCollapseDuration] = useState(900);
  const mergeTimers = useRef<number[]>([]);

  useEffect(
    () => () => mergeTimers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  // item rows
  const [rows, setRows] = useState<Row[]>(
    order
      ? order.items.map((it) => ({
          key: newRowKey(),
          product: {
            value: String(it.item.id),
            label: it.item.description,
            defaultMeasurementUnit: it.item.defaultMeasurementUnit,
            conversions: it.item.conversions,
            processings: it.item.processings,
          },
          amount: `${it.amount}`,
          unit: it.measurementUnit,
          processingId: it.processingId ?? null,
          editing: false,
        }))
      : [],
  );

  const addRow = () =>
    setRows((prev) => [
      { key: newRowKey(), product: null, amount: "", unit: "", processingId: null, editing: true },
      ...prev,
    ]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  // validate + commit an editing row back to read-only
  const saveRow = (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    if (!row.product || !row.amount || !row.unit) {
      toast.error("Preencha produto, quantidade e unidade.");
      return;
    }
    const duplicate = rows.find(
      (candidate) =>
        candidate.key !== key &&
        candidate.product?.value === row.product?.value &&
        candidate.unit === row.unit &&
        candidate.processingId === row.processingId,
    );

    if (duplicate) {
      setMergeFeedback({
        sourceKey: key,
        targetKey: duplicate.key,
        phase: "source-highlight",
      });
      mergeTimers.current.push(
        window.setTimeout(() => {
          setMergeFeedback({
            sourceKey: key,
            targetKey: duplicate.key,
            phase: "source-collapse",
          });
          mergeTimers.current.push(
            window.setTimeout(() => {
              setRows((prev) => {
                const source = prev.find((candidate) => candidate.key === key);
                const target = prev.find(
                  (candidate) => candidate.key === duplicate.key,
                );
                if (!source || !target) return prev;

                const amount = parseFloat(
                  (parseFloat(target.amount) + parseFloat(source.amount)).toFixed(2),
                );
                return prev
                  .filter((candidate) => candidate.key !== key)
                  .map((candidate) =>
                    candidate.key === duplicate.key
                      ? { ...candidate, amount: String(amount), editing: false }
                      : candidate,
                  );
              });
              setMergeFeedback({
                sourceKey: key,
                targetKey: duplicate.key,
                phase: "target",
              });
              mergeTimers.current.push(
                window.setTimeout(() => setMergeFeedback(null), 1000),
              );
            }, mergeCollapseDuration),
          );
        }, 1000),
      );
      return;
    }

    setRows((prev) => {
      const savedRow = prev.find((candidate) => candidate.key === key);
      if (!savedRow?.product) return prev;
      return prev.map((candidate) =>
        candidate.key === key ? { ...candidate, editing: false } : candidate,
      );
    });
  };

  // an "add" row that gets cancelled is just removed
  const cancelRow = (key: string) => {
    const row = rows.find((r) => r.key === key);
    // if it never had a product, treat cancel as remove (it was a fresh add)
    if (!row?.product) removeRow(key);
    else updateRow(key, { editing: false });
  };

  const handleConfirm = async () => {
    if (!client || !clientUnit || !batch || !deliverAt) {
      toast.error("Preencha cliente, unidade, lote e data de entrega.");
      return;
    }
    const editing = rows.filter((r) => r.editing);
    if (editing.length > 0) {
      toast.error("Termine de editar os itens antes de salvar.");
      return;
    }
    const valid = rows.filter((r) => r.product && r.amount && r.unit);
    if (valid.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }

    // merge-on-duplicate: rows sharing product+unit+processing are summed
    const merged = new Map<
      string,
      { item: string; amount: number; measurementUnit: string; processingId: number | null }
    >();
    valid.forEach((r) => {
      const k = `${r.product!.value}-${r.unit}-${r.processingId ?? ""}`;
      const amt = parseFloat(r.amount);
      const existing = merged.get(k);
      if (existing)
        existing.amount = parseFloat((existing.amount + amt).toFixed(2));
      else
        merged.set(k, {
          item: r.product!.value,
          amount: amt,
          measurementUnit: r.unit,
          processingId: r.processingId,
        });
    });

    const deliverDate = forceDateDay(deliverAt);
    await onSubmit({
      clientUnitId: clientUnit.value ? Number(clientUnit.value) : null,
      client: client.label,
      observation: observation.trim(),
      batch: batch.value,
      deliverAt: deliverDate.toISOString(),
      items: [...merged.values()],
    });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
      <NewBatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        onCreated={(created) => setBatch({ value: created.id, label: batchLabel(created) })}
      />
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onCreated={(created) => {
          setClient({ value: String(created.id), label: created.name });
          const activeUnits = created.units.filter((unit) => !unit.archived);
          setClientUnit(activeUnits.length === 1 ? { value: String(activeUnits[0].id), label: activeUnits[0].name } : null);
        }}
      />
      <NewProductDialog
        open={productDialogRow !== null}
        onOpenChange={(open) => !open && setProductDialogRow(null)}
        onCreated={(product) => {
          if (!productDialogRow) return;
          const productOption: ProductPickerOption = {
            value: product.id,
            label: product.description,
            defaultMeasurementUnit: product.defaultMeasurementUnit,
            conversions: product.conversions,
            processings: product.processings.map((item) => ({
              id: Number(item.id),
              name: item.name,
            })),
          };
          const units = productUnits(productOption);
          updateRow(productDialogRow, {
            product: productOption,
            unit: units.length === 1 ? units[0] : "",
            processingId: null,
          });
          setProductDialogRow(null);
        }}
      />
      <EditActions
        cancelHref={cancelHref}
        onSubmit={handleConfirm}
        submitting={submitting}
      />

      <h1 className="text-2xl font-semibold tracking-tight">
        {isNew ? "Novo pedido" : "Alterar pedido"}
      </h1>

      {/* top row: client / batch / deliver date */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <AsyncCombobox
            loadOptions={loadClientOptions}
            value={client}
            onChange={(opt) => {
              const nextClient = opt as Option | null;
              if (nextClient?.value !== client?.value) setClientUnit(null);
              setClient(nextClient);
            }}
            placeholder="Selecionar cliente"
            emptyText="Nenhum cliente"
            onAdd={() => setClientDialogOpen(true)}
            addLabel="Adicionar cliente"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <AsyncCombobox
            loadOptions={(search) =>
              client
                ? loadUnitOptions(Number(client.value), search)
                : Promise.resolve({ options: [], hasMore: false })
            }
            value={clientUnit}
            onChange={(opt) => setClientUnit(opt as Option | null)}
            placeholder={client ? "Selecionar unidade" : "Selecione o cliente"}
            emptyText="Nenhuma unidade"
            disabled={!client}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lote</Label>
          <AsyncCombobox
            loadOptions={loadBatchOptions}
            value={batch}
            onChange={(opt) => setBatch(opt as Option | null)}
            placeholder="Lote"
            emptyText="Nenhum lote"
            onAdd={() => setBatchDialogOpen(true)}
            addLabel="Adicionar lote"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliverAt">Entrega</Label>
          <Input
            id="deliverAt"
            type="date"
            value={deliverAt}
            onChange={(e) => setDeliverAt(e.target.value)}
          />
        </div>
      </div>

      {/* observation */}
      <div className="space-y-1.5">
        <Label htmlFor="observation">Observação</Label>
        <Input
          id="observation"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder="Observação de entrega (opcional)"
        />
      </div>

      {/* items table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Itens</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Remoção: {mergeCollapseDuration} ms</span>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={mergeCollapseDuration}
              onChange={(event) =>
                setMergeCollapseDuration(Number(event.target.value))
              }
              className="w-32 accent-primary"
              aria-label="Duração temporária da animação de remoção"
            />
          </label>
          <Button type="button" size="sm" onClick={addRow} variant="outline">
            <Plus className="size-4" /> Adicionar item
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Produto
              </TableHead>
              <TableHead className="h-10 w-32 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quantidade
              </TableHead>
              <TableHead className="h-10 w-28 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Unidade
              </TableHead>
              <TableHead className="h-10 w-28 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum item. Clique em “Adicionar item”.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) =>
                row.editing ? (
                  <EditingRow
                    key={row.key}
                    row={row}
                    onChange={(patch) => updateRow(row.key, patch)}
                    onSave={() => saveRow(row.key)}
                    onCancel={() => cancelRow(row.key)}
                    onRemove={() => removeRow(row.key)}
                    onAddProduct={() => setProductDialogRow(row.key)}
                    mergePhase={
                      mergeFeedback?.sourceKey === row.key &&
                      (mergeFeedback.phase === "source-highlight" ||
                        mergeFeedback.phase === "source-collapse")
                        ? mergeFeedback.phase
                        : null
                    }
                    mergeCollapseDuration={mergeCollapseDuration}
                  />
                ) : (
                  <ReadRow
                    key={row.key}
                    row={row}
                    onEdit={() => updateRow(row.key, { editing: true })}
                    onRemove={() => removeRow(row.key)}
                    justMerged={
                      mergeFeedback?.phase === "target" &&
                      mergeFeedback.targetKey === row.key
                    }
                  />
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Read-only item row with edit + delete actions. */
function ReadRow({
  row,
  onEdit,
  onRemove,
  justMerged,
}: {
  row: Row;
  onEdit: () => void;
  onRemove: () => void;
  justMerged: boolean;
}) {
  const processingName = row.processingId
    ? row.product?.processings.find((p) => p.id === row.processingId)?.name
    : null;
  return (
    <TableRow className={justMerged ? "order-row-merge-target" : undefined}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{row.product?.label}</span>
          {processingName && <Badge variant="secondary" className="font-normal">{processingName}</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-center tabular-nums text-muted-foreground">
        <span
          className={justMerged ? "order-quantity-merge inline-block" : undefined}
        >
          {parseFloat(row.amount).toLocaleString("pt-BR")}
        </span>
      </TableCell>
      <TableCell className="text-center text-muted-foreground">
        {row.unit}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            aria-label="Editar item"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remover item"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Editing item row: inline product / amount / unit / processing inputs + save/cancel/remove. */
function EditingRow({
  row,
  onChange,
  onSave,
  onCancel,
  onRemove,
  onAddProduct,
  mergePhase,
  mergeCollapseDuration,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onAddProduct: () => void;
  mergePhase: "source-highlight" | "source-collapse" | null;
  mergeCollapseDuration: number;
}) {
  const unitOptions: Option[] = row.product
    ? productUnits(row.product).map((unit) => ({ value: unit, label: unit }))
    : [];

  const hasProcessings = (row.product?.processings?.length ?? 0) > 0;
  const selectedProcessingLabel = row.processingId
    ? row.product?.processings.find((processing) => processing.id === row.processingId)?.name
    : null;

  return (
    <TableRow
      className={
        mergePhase === "source-highlight"
          ? "order-row-merge-highlight"
          : mergePhase === "source-collapse"
            ? "order-row-merge-out"
            : undefined
      }
      style={
        {
          "--merge-collapse-duration": `${mergeCollapseDuration}ms`,
        } as CSSProperties
      }
    >
      <TableCell>
        <div className="order-merge-cell grid grid-cols-3 gap-2">
          <div className={hasProcessings ? "col-span-2" : "col-span-3"}>
            <AsyncCombobox
              loadOptions={loadProductOptions}
              value={row.product}
              onChange={(opt) => {
                const product = opt as ProductPickerOption | null;
                const units = product ? productUnits(product) : [];
                onChange({
                  product,
                  unit: units.length === 1 ? units[0] : "",
                  processingId: null,
                });
              }}
              placeholder="Produto"
              emptyText="Nenhum produto"
              onAdd={onAddProduct}
              addLabel="Adicionar produto"
            />
          </div>
          {hasProcessings && (
            <Select
              value={row.processingId ? String(row.processingId) : "none"}
              onValueChange={(value) => onChange({ processingId: value === "none" ? null : Number(value) })}
            >
              <SelectTrigger className="w-full min-w-0">
                <span className="truncate text-left">{selectedProcessingLabel ?? "Nenhum"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum processamento</SelectItem>
                {row.product!.processings.map((processing) => <SelectItem key={processing.id} value={String(processing.id)}>{processing.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="order-merge-cell">
          <Input
            type="number"
            inputMode="decimal"
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="0"
            className="text-center"
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="order-merge-cell">
          <Select
            value={row.unit}
            onValueChange={(v) => onChange({ unit: v ?? "" })}
            disabled={!row.product}
          >
            <SelectTrigger>
              <SelectValue placeholder={row.product ? "Unidade" : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell>
        <div className="order-merge-cell flex items-center justify-center gap-1">
          {mergePhase ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Somando…
            </span>
          ) : (
            <>
              <Button size="icon-sm" onClick={onSave} aria-label="Salvar item">
                <Check className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onCancel}
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
                aria-label="Remover item"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
