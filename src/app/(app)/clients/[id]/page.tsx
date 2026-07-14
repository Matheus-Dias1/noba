"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useClient } from "@/queries/clients";
import { useClientStats } from "@/queries/client-stats";
import { useOrders } from "@/queries/orders";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { ContactsManager } from "@/components/shared/contacts-manager";
import { formatDate, formatNumber, padBatchNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/queries/orders";
import type { ClientUnit } from "@/queries/clients";

const CHART_COLORS = [
  "#265948",
  "#47846f",
  "#5a9a82",
  "#6db095",
  "#80c6a8",
  "#df3d0a",
  "#e8622b",
  "#f08748",
  "#f8ac65",
  "#ffd182",
];

type Tab = "orders" | "stats";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = Number(params.id);
  const { data: client, status } = useClient(clientId);
  const [tab, setTab] = useState<Tab>("orders");

  if (status === "pending" || !client) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/clients")}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client.cnpj && `CNPJ: ${client.cnpj}`}
              {client.cnpj && client.units.length > 0 && " · "}
              {client.units.length > 0 &&
                `${client.units.length} ${client.units.length === 1 ? "unidade" : "unidades"}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> Editar
        </Button>
      </div>
      {/* tabs */}
      <div className="flex rounded-lg border p-0.5 w-fit">
        {[
          { key: "orders" as const, label: "Pedidos" },
          { key: "stats" as const, label: "Estatísticas" },
        ].map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "ghost"}
            onClick={() => setTab(t.key)}
            className="rounded-md"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* content */}
      {tab === "orders" && (
        <OrdersTab clientId={clientId} units={client.units} />
      )}
      {tab === "stats" && <StatsTab clientId={clientId} units={client.units} />}
    </div>
  );
}

/* ==================== ORDERS TAB ==================== */

function OrdersTab({ units }: { clientId: number; units: ClientUnit[] }) {
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } = useOrders(
    {},
  );

  const unitIdSet = useMemo(() => new Set(units.map((u) => u.id)), [units]);

  const orders = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.edges.map((e) => e.node)) ?? [];
    return all.filter(
      (o) => o.clientUnitId !== null && unitIdSet.has(o.clientUnitId),
    );
  }, [data, unitIdSet]);

  const columns: DataTableColumn<OrderListItem>[] = [
    {
      header: "Unidade",
      cell: (o) => {
        const unit = units.find((u) => u.id === o.clientUnitId);
        return <span className="font-medium">{unit?.name ?? "—"}</span>;
      },
    },
    {
      header: "Lote",
      className: "w-20 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">
          {padBatchNumber(o.batch.number)}
        </span>
      ),
    },
    {
      header: "Entrega",
      className: "w-32 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDate(o.deliverAt)}
        </span>
      ),
    },
    {
      header: "Itens",
      cell: (o) => (
        <Badge variant="secondary" className="font-normal">
          {o.items.length}
        </Badge>
      ),
    },
    {
      header: "Status",
      className: "w-24 text-center",
      cell: (o) =>
        o.status === "cancelled" ? (
          <Badge variant="destructive" className="font-normal">
            cancelada
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            ativa
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(o) => String(o.id)}
        emptyText="Nenhum pedido deste cliente."
      />
      {hasNextPage && (
        <Button
          variant="outline"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-fit"
        >
          {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </div>
  );
}

/* ==================== STATS TAB ==================== */

function StatsTab({
  clientId,
  units,
}: {
  clientId: number;
  units: ClientUnit[];
}) {
  const { data: stats, status } = useClientStats(clientId);

  if (status === "pending" || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
        <Skeleton className="h-64 rounded-xl sm:col-span-2 lg:col-span-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* number cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pedidos" value={formatNumber(stats.totalOrders)} />
        <StatCard label="Itens" value={formatNumber(stats.totalItems)} />
        <StatCard label="Ranking" value={stats.rank ? `#${stats.rank}` : "—"} />
        <StatCard
          label="Último pedido"
          value={stats.lastOrderDate ? formatDate(stats.lastOrderDate) : "—"}
        />
      </div>

      {/* orders by month */}
      {stats.ordersByMonth.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pedidos por mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.ordersByMonth}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(m: string) => {
                  const [, mo] = m.split("-");
                  return `${parseInt(mo)}/${m.slice(2, 4)}`;
                }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#265948" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* two columns: top products + orders by unit */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* top products */}
        {stats.topProducts.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top produtos
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={stats.topProducts}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                  tickFormatter={(v: string) =>
                    v.length > 18 ? v.slice(0, 18) + "…" : v
                  }
                />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="totalItems" radius={[0, 4, 4, 0]}>
                  {stats.topProducts.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* orders by unit */}
        {stats.ordersByUnit.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pedidos por unidade
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.ordersByUnit}>
                <XAxis dataKey="unitName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.ordersByUnit.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* contacts (per unit) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Unidades &amp; Contatos
        </h3>
        {units.map((unit) => (
          <div key={unit.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-medium">
                {unit.name}
              </Badge>
              {[unit.street, unit.city, unit.state]
                .filter(Boolean)
                .join(", ") && (
                <span className="text-sm text-muted-foreground">
                  {[unit.street, unit.city, unit.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </div>
            <ContactsManager
              contacts={unit.contacts}
              owner={{ type: "clientUnit", id: unit.id }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== HELPERS ==================== */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className={cn("p-4")}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
