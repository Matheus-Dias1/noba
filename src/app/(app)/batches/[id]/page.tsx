"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useBatchSummary } from "@/queries/batches";
import { getAllSum, getSumByProduct, getSumByOrder } from "@/compute/aggregations";
import { formatDate, formatBatchNumber, formatNumber } from "@/lib/format";
import type { BatchSummary } from "@/types";

type Tab = "overview" | "products" | "clients";

const TABS: { title: string; value: Tab }[] = [
  { title: "Geral", value: "overview" },
  { title: "Por produto", value: "products" },
  { title: "Por cliente", value: "clients" },
];

/**
 * Batch details — ported from the original `pages/Batches/BatchDetails`.
 *
 * Three aggregation views of the batch's orders (Geral / Por produto / Por
 * cliente), computed client-side from the populated batch (§10 #6: moving this
 * server-side is a later optimization). A collapsible filter panel lets the
 * user include/exclude individual orders from the aggregations. The Geral and
 * Por cliente tabs offer an Excel download (wired in the export phase).
 */
export default function BatchDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: batch, isLoading } = useBatchSummary(params.id);

  const [tab, setTab] = useState<Tab>("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  // selected order ids. `null` means "no manual overrides yet" → all orders
  // included. We only materialize the map on first toggle (avoids an init effect).
  const [selected, setSelected] = useState<Record<string, boolean> | null>(null);

  // the batch with only the selected orders applied
  const filteredBatch: BatchSummary | undefined = useMemo(() => {
    if (!batch || !selected) return batch;
    return { ...batch, orders: batch.orders.filter((o) => selected[o.id] !== false) };
  }, [batch, selected]);

  const overview = useMemo(() => (filteredBatch ? getAllSum(filteredBatch) : []), [filteredBatch]);
  const byProduct = useMemo(
    () => (filteredBatch ? getSumByProduct(filteredBatch) : []),
    [filteredBatch],
  );
  const byClient = useMemo(() => (filteredBatch ? getSumByOrder(filteredBatch) : []), [filteredBatch]);

  const toggleOrder = (id: string) =>
    setSelected((prev) => {
      const base = prev ?? {};
      const cur = base[id] === undefined ? true : base[id];
      return { ...base, [id]: !cur };
    });

  const handleDownload = async () => {
    if (!filteredBatch || !batch) return;
    const which = tab === "overview" ? "general" : "orders";
    const payload =
      which === "general"
        ? overview.map((d) => ({ item: d.item, amount: d.amount, unit: d.unit }))
        : byClient.map((c) => ({
            client: c.client,
            deliverAt: c.deliverAt,
            items: c.items.map((i) => ({
              id: i.id,
              name: i.name,
              amount: i.amount,
              unit: i.unit,
            })),
          }));
    try {
      const res = await fetch(`/api/download/${which}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload, batch: `Lote ${formatBatchNumber(batch.number)}` }),
      });
      if (!res.ok) throw new Error("Falha no download");
      const blob = new Blob([await res.arrayBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Lote ${formatBatchNumber(batch.number)} ${
        which === "general" ? "GERAL" : "PEDIDOS"
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // surfaced via the failed request; keep silent here
    }
  };

  if (isLoading || !batch || !filteredBatch) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const showDownload = tab === "overview" || tab === "clients";

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/batches")}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatBatchNumber(batch.number)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* tabs */}
          <div className="flex rounded-lg border p-0.5">
            {TABS.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={tab === t.value ? "default" : "ghost"}
                onClick={() => setTab(t.value)}
                className="rounded-md"
              >
                {t.title}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Filtrar pedidos"
          >
            <Filter className="size-4" />
          </Button>
          {showDownload && (
            <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Baixar">
              <Download className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* table search (only meaningful for the grouped tabs) */}
      {tab !== "overview" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${tab === "products" ? "produto" : "cliente/item"}`}
            className="pl-8"
          />
        </div>
      )}

      {/* order filter panel */}
      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">Pedidos incluídos</p>
            <div className="flex flex-wrap gap-1.5">
              {batch.orders
                .slice()
                .sort((a, b) => (a.deliverAt > b.deliverAt ? 1 : a.deliverAt < b.deliverAt ? -1 : 0))
                .map((o) => {
                  const label = `${o.client} - ${formatDate(o.deliverAt)}`;
                  const raw = selected?.[o.id];
                  const on = raw === undefined ? true : raw;
                  return (
                    <Button
                      key={o.id}
                      size="xs"
                      variant={on ? "default" : "outline"}
                      onClick={() => toggleOrder(o.id)}
                    >
                      {label}
                    </Button>
                  );
                })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Geral */}
      {tab === "overview" && (
        <div className="rounded-lg border">
          <DataTable
            headers={["Item", "Quantidade", "Unidade"]}
            rows={overview.map((d) => [d.item, formatNumber(d.amount), d.unit])}
          />
        </div>
      )}

      {/* Por produto */}
      {tab === "products" &&
        byProduct
          .filter((group) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            const haystack = [
              group.item,
              ...group.clients.flatMap((c) => [c.name, c.unit, formatNumber(c.amount)]),
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(q);
          })
          .map((group) => {
            const total = overview.find((o) => o.item === group.item);
            return (
              <div key={group.item} className="rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <h2 className="font-medium">{group.item}</h2>
                  <h2 className="text-sm text-muted-foreground">
                    Total:{" "}
                    <span className="font-medium text-foreground">
                      {total ? `${formatNumber(total.amount)} ${total.unit}` : "—"}
                    </span>
                  </h2>
                </div>
                <DataTable
                  headers={["Cliente", "Quantidade", "Unidade"]}
                  rows={group.clients.map((c) => [c.name, formatNumber(c.amount), c.unit])}
                />
              </div>
            );
          })}

      {/* Por cliente */}
      {tab === "clients" &&
        byClient
          .filter((group) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            const haystack = [
              group.client,
              formatDate(group.deliverAt),
              ...group.items.flatMap((i) => [i.name, i.unit, formatNumber(i.amount)]),
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(q);
          })
          .map((group) => (
            <div key={`${group.client}-${group.deliverAt}`} className="rounded-lg border">
              <div className="border-b px-4 py-2">
                <h2 className="font-medium">
                  {group.client} - {formatDate(group.deliverAt)}
                </h2>
              </div>
              <DataTable
                headers={["Item", "Quantidade", "Unidade"]}
                rows={group.items.map((i) => [i.name, formatNumber(i.amount), i.unit])}
              />
            </div>
          ))}
    </div>
  );
}

/**
 * Uniform 3-column table. Uses `table-fixed` with explicit column widths so
 * every table across the grouped tabs (Por produto / Por cliente) lines up.
 * Cols 2 & 3 are centered.
 */
const COL_WIDTHS = ["w-[60%]", "w-[22%]", "w-[18%]"];
function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          {headers.map((h, i) => (
            <TableHead
              key={h}
              className={`${COL_WIDTHS[i] ?? ""} h-9 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? "pl-4" : "text-center"}`}
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <TableRow key={ri}>
            {row.map((cell, ci) => (
              <TableCell key={ci} className={`${ci === 0 ? "pl-4 font-medium" : "text-center tabular-nums text-muted-foreground"}`}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
