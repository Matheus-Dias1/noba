"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { useOrders } from "@/queries/orders";
import { loadBatchOptions } from "@/queries/batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { AsyncCombobox, type AsyncComboboxOption } from "@/components/shared/async-combobox";
import { formatDate, padBatchNumber } from "@/lib/format";
import type { OrderListItem } from "@/queries/orders";

/** Show up to 10 product chips, then a "+N" summary chip for the rest. */
function ProductTags({ items }: { items: OrderListItem["items"] }) {
  const descs = items.map((i) => i.item.description.trim());
  const shown = descs.slice(0, 10);
  const rest = descs.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((d) => (
        <Badge key={d} variant="secondary" className="font-normal">
          {d}
        </Badge>
      ))}
      {rest > 0 && (
        <span className="text-xs text-muted-foreground">
          +{rest} {rest === 1 ? "item" : "itens"}
        </span>
      )}
    </div>
  );
}

/**
 * Orders list — table view (replaces the original card grid).
 *
 * Filters: batch picker, client text, and deliverAt date range (from/to).
 * Columns: client, batch, created, delivery, items (tags, max 10 + truncate).
 * Clicking a row opens the order editor.
 */
export default function OrdersPage() {
  const [batchFilter, setBatchFilter] = useState<AsyncComboboxOption<string> | null>(null);
  const [clientFilter, setClientFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, status, fetchNextPage, isFetching, isFetchingNextPage, hasNextPage } = useOrders({
    batch: batchFilter?.value,
    client: clientFilter,
    from: from || undefined,
    to: to || undefined,
  });

  const orders = useMemo(
    () => data?.pages.flatMap((p) => p.edges.map((e) => e.node)) ?? [],
    [data],
  );

  const hasFilters = batchFilter || clientFilter || from || to;

  const columns: DataTableColumn<OrderListItem>[] = [
    {
      header: "Cliente",
      cell: (o) => <span className="font-medium">{o.client}</span>,
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
    setClientFilter("");
    setFrom("");
    setTo("");
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

      {/* filters — one row, wrapping only when space runs out */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lote</Label>
          <AsyncCombobox
            loadOptions={loadBatchOptions}
            value={batchFilter}
            onChange={setBatchFilter}
            placeholder="Filtrar por lote"
            emptyText="Nenhum lote"
          />
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              placeholder="Filtrar por cliente"
              className="pl-8"
            />
          </div>
        </div>
        <div className="min-w-[150px] space-y-1.5">
          <Label htmlFor="from" className="text-xs text-muted-foreground">Entrega de</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-[150px] space-y-1.5">
          <Label htmlFor="to" className="text-xs text-muted-foreground">Entrega até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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

      {/* load more */}
      {hasNextPage && (
        <div>
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-fit"
          >
            {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
      {isFetching && !isFetchingNextPage && orders.length > 0 && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
    </div>
  );
}
