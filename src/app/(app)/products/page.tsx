"use client";

import { Plus, Search, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useProducts } from "@/queries/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { UnitTags } from "@/components/products/unit-tags";
import type { Product } from "@/types";

/**
 * Products list — table view (replaces the original card grid).
 *
 * Search input (case-insensitive, server-filtered) + infinite list with a
 * "Carregar mais" button. Columns: description, units (default highlighted),
 * and an edit action. Clicking a row opens the editor.
 */
export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data, status, fetchNextPage, isFetching, isFetchingNextPage, hasNextPage } =
    useProducts(search);

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.edges.map((e) => e.node)) ?? [],
    [data],
  );

  const columns: DataTableColumn<Product>[] = [
    {
      header: "Descrição",
      cell: (p) => <span className="font-medium">{p.description.trim()}</span>,
    },
    {
      header: "Unidades",
      cell: (p) => <UnitTags defaultUnit={p.defaultMeasurementUnit} conversions={p.conversions} />,
    },
    {
      header: "",
      className: "w-10 text-right",
      cell: (p) => (
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Editar ${p.description}`}
          render={<Link href={`/products/${p.id}`} />}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* header + add */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Adicione e altere dados de produtos</p>
        </div>
        <Button size="icon-lg" render={<Link href="/products/new" aria-label="Novo produto" />}>
          <Plus className="size-5" />
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto"
          className="pl-8"
        />
      </div>

      {/* table */}
      {status === "pending" ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          rowKey={(p) => p.id}
          emptyText="Nenhum produto encontrado."
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
      {isFetching && !isFetchingNextPage && products.length > 0 && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
    </div>
  );
}
