"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BatchCard } from "@/components/batches/batch-card";
import { NewBatchDialog } from "@/components/batches/new-batch-dialog";
import { useBatchSummaries } from "@/queries/batches";
import type { BatchSummary } from "@/types";

/**
 * Batches list — ported from the original `pages/Batches`.
 *
 * Search by batch number + infinite list of BatchCards (each carrying a summary
 * of its orders' product descriptions as chips). The "+" button opens the
 * New Batch dialog. Newest first, paginated (page size 30).
 */
export default function BatchesPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { data, status, fetchNextPage, isFetching, isFetchingNextPage, hasNextPage, refetch } =
    useBatchSummaries(search);

  const batches = useMemo(
    () => data?.pages.flatMap((p) => p.edges.map((e) => e.node)) ?? [],
    [data],
  );

  // top products by quantity (converted to the product's default unit) → chips,
  // capped at 10; plus the unique clients that have orders in the batch.
  const getSummary = (batch: BatchSummary) => {
    const totals = new Map<string, number>();
    const unitOf = new Map<string, string>();
    const clients = new Set<string>();
    batch.orders.forEach((order) => {
      clients.add(order.client);
      order.items.forEach((item) => {
        const desc = item.item.description;
        let amount = item.amount;
        const norm = (s: string) => s.toLowerCase().trim();
        if (norm(item.measurementUnit) !== norm(item.item.defaultMeasurementUnit)) {
          const conv = item.item.conversions.find(
            (c) => norm(c.measurementUnit) === norm(item.measurementUnit),
          );
          if (conv) amount = amount / conv.oneDefaultEquals;
        }
        totals.set(desc, (totals.get(desc) ?? 0) + amount);
        unitOf.set(desc, item.item.defaultMeasurementUnit);
      });
    });
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const items = sorted
      .slice(0, 10)
      .map(([desc, amount]) => ({ desc, amount, unit: unitOf.get(desc) ?? "" }));
    const overflowCount = Math.max(0, sorted.length - items.length);
    return { items, overflowCount, clients: [...clients] };
  };

  // next batch number guess = highest seen + 1 (server assigns the real value)
  const nextNumber = batches.length ? Math.max(...batches.map((b) => b.number)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <NewBatchDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        nextNumber={nextNumber}
        onCreated={() => refetch()}
      />

      {/* header + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lotes</h1>
          <p className="text-sm text-muted-foreground">
            Resumo geral de cada lote, incluindo itens de cada pedido
          </p>
        </div>
        <Button size="icon-lg" onClick={() => setModalOpen(true)} aria-label="Novo lote">
          <Plus className="size-5" />
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar lote"
          className="pl-8"
        />
      </div>

      {/* list */}
      {status === "pending" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : batches.length === 0 && !isFetching ? (
        <p className="text-sm text-muted-foreground">Nenhum lote encontrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const summary = getSummary(batch);
            return (
              <BatchCard
                key={batch.id}
                id={batch.id}
                number={batch.number}
                startDate={batch.startDate}
                endDate={batch.endDate}
                items={summary.items}
                overflowCount={summary.overflowCount}
                clients={summary.clients}
              />
            );
          })}
        </div>
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
      {isFetching && !isFetchingNextPage && batches.length > 0 && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
    </div>
  );
}
