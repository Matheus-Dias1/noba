"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useOrders } from "@/queries/orders";
import { loadBatchOptions, loadProductOptions, type ProductPickerOption } from "@/queries/batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { AsyncCombobox, type AsyncComboboxOption } from "@/components/shared/async-combobox";
import { ProductTags } from "@/components/shared/product-tags";
import { formatDate, padBatchNumber } from "@/lib/format";
import type { OrderListItem } from "@/queries/orders";
import { loadClientOptions, loadUnitOptions } from "@/queries/clients";
import { PagePagination } from "@/components/shared/page-pagination";

/**
 * Orders list — table view.
 *
 * Filters: batch picker, client text, unit picker, product text, and deliverAt
 * date range (from/to).
 * Columns: client, unit, batch, created, delivery, items (tags).
 * Clicking a row opens the order editor.
 */
export default function OrdersPage() {
  const [batchFilter, setBatchFilter] = useState<AsyncComboboxOption<string> | null>(null);
  const [clientFilter, setClientFilter] = useState<AsyncComboboxOption<string> | null>(null);
  const [unitFilter, setUnitFilter] = useState<AsyncComboboxOption<string> | null>(null);
  const [productFilters, setProductFilters] = useState<ProductPickerOption[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const clientSelectionSequence = useRef(0);

  const { data, status, isFetching } = useOrders({
    batch: batchFilter?.value,
    clientId: clientFilter ? Number(clientFilter.value) : null,
    clientUnit: unitFilter ? Number(unitFilter.value) : null,
    productIds: productFilters.map((product) => product.value),
    from: from || undefined,
    to: to || undefined,
  }, page);

  const orders = useMemo(
    () => data?.edges.map((edge) => edge.node) ?? [],
    [data],
  );

  const hasFilters = batchFilter || clientFilter || unitFilter || productFilters.length > 0 || from || to;

  const columns: DataTableColumn<OrderListItem>[] = [
    {
      header: "Cliente",
      cell: (o) => (
        <span className="font-medium">
          {o.clientName ?? o.client}
        </span>
      ),
    },
    {
      header: "Unidade",
      className: "w-32",
      cell: (o) => (
        <span className="text-muted-foreground">{o.unitName ?? "—"}</span>
      ),
    },
    {
      header: "Lote",
      className: "w-20 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">{padBatchNumber(o.batch.number)}</span>
      ),
    },
    {
      header: "Criado em",
      className: "w-32 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">{formatDate(o.createdAt)}</span>
      ),
    },
    {
      header: "Entrega",
      className: "w-32 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">{formatDate(o.deliverAt)}</span>
      ),
    },
    {
      header: "Itens",
      cell: (o) => <ProductTags items={o.items} />,
    },
  ];

  const clearFilters = () => {
    setBatchFilter(null);
    setClientFilter(null);
    setUnitFilter(null);
    setProductFilters([]);
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* header + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Detalhes de cada pedido</p>
        </div>
        <Button size="icon-lg" render={<Link href="/orders/new" aria-label="Novo pedido" />}>
          <Plus className="size-5" />
        </Button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lote</Label>
          <AsyncCombobox
            loadOptions={loadBatchOptions}
            value={batchFilter}
            onChange={(option) => { setBatchFilter(option); setPage(1); }}
            placeholder="Filtrar por lote"
            emptyText="Nenhum lote"
          />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <AsyncCombobox loadOptions={loadClientOptions} value={clientFilter} onChange={async (option) => {
            const sequence = ++clientSelectionSequence.current;
            if (option?.value !== clientFilter?.value) setUnitFilter(null);
            setClientFilter(option);
            setPage(1);
            if (!option) return;
            const units = await loadUnitOptions(Number(option.value), "");
            if (sequence === clientSelectionSequence.current && units.options.length === 1) {
              setUnitFilter(units.options[0]);
            }
          }} placeholder="Todos os clientes" emptyText="Nenhum cliente" />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Unidade</Label>
          <AsyncCombobox
            loadOptions={(search) => clientFilter
              ? loadUnitOptions(Number(clientFilter.value), search)
              : Promise.resolve({ options: [], hasMore: false })}
            value={unitFilter}
            onChange={(option) => { setUnitFilter(option); setPage(1); }}
            placeholder={clientFilter ? "Todas as unidades" : "Selecione um cliente"}
            emptyText="Nenhuma unidade"
            disabled={!clientFilter}
          />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Produto</Label>
          <AsyncCombobox loadOptions={loadProductOptions} value={null} onChange={(option) => {
            const product = option as ProductPickerOption | null;
            if (product && !productFilters.some((item) => item.value === product.value)) { setProductFilters((items) => [...items, product]); setPage(1); }
          }} placeholder="Adicionar produto" emptyText="Nenhum produto" triggerContent={productFilters.length > 0 ? (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1 py-0.5">
              {productFilters.map((product) => (
                <Badge key={product.value} variant="secondary" className="max-w-full">
                  <span className="truncate">{product.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remover ${product.label}`}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProductFilters((items) => items.filter((item) => item.value !== product.value));
                      setPage(1);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setProductFilters((items) => items.filter((item) => item.value !== product.value));
                        setPage(1);
                      }
                    }}
                  >
                    <X className="ml-1 size-3" />
                  </span>
                </Badge>
              ))}
            </span>
          ) : undefined} />
        </div>
        <div className="min-w-[150px] space-y-1.5">
          <Label htmlFor="from" className="text-xs text-muted-foreground">Entrega de</Label>
          <Input id="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="min-w-[150px] space-y-1.5">
          <Label htmlFor="to" className="text-xs text-muted-foreground">Entrega até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
            <X className="size-4" /> Limpar
          </Button>
        )}
      </div>

      {/* table */}
      {status === "pending" ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : (
        <DataTable
          columns={columns}
          rows={orders}
          rowKey={(o) => o.id}
          emptyText="Nenhum pedido encontrado."
          onRowClick={(o) => (window.location.href = `/orders/${o.id}`)}
        />
      )}

      <PagePagination page={page} totalCount={data?.totalCount ?? 0} pageSize={30} onPageChange={setPage} />
      {isFetching && orders.length > 0 && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
    </div>
  );
}
