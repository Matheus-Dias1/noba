"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { useClient } from "@/queries/clients";
import { useClientStats } from "@/queries/client-stats";
import { useOrders } from "@/queries/orders";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { ProductTags } from "@/components/shared/product-tags";
import { ClientDialog } from "@/components/clients/client-dialog";
import { UnitsContactsTable } from "@/components/clients/units-contacts-table";
import { formatDate, formatNumber, padBatchNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/queries/orders";
import { PagePagination } from "@/components/shared/page-pagination";

const CHART_COLORS = [
  "#16a34a",
  "#2563eb",
  "#d97706",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#4f46e5",
  "#ea580c",
];

function chartColor(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return CHART_COLORS[hash % CHART_COLORS.length];
}

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Format "YYYY-MM" → "Outubro 2025" */
function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = parseInt(m, 10) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS_PT[idx]} ${y}` : ym;
}

type Tab = "orders" | "stats";

type TooltipEntry<TPayload> = {
  color?: string;
  dataKey?: string | number;
  payload: TPayload;
  value?: number;
};

type ChartTooltipProps<TPayload> = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry<TPayload>>;
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = Number(params.id);
  const { data: client, status } = useClient(clientId);
  const [tab, setTab] = useState<Tab>("orders");
  const [editOpen, setEditOpen] = useState(false);

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
      <ClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={
          client
            ? {
                id: client.id,
                name: client.name,
                cnpj: client.cnpj,
                legalName: client.legalName,
              }
            : undefined
        }
      />

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
              {[client.legalName, client.cnpj].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Editar
        </Button>
      </div>

      {/* unidades & contatos — above tabs so it's always visible */}
      <UnitsContactsTable units={client.units} clientId={clientId} />

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
        <OrdersTab clientId={clientId} />
      )}
      {tab === "stats" && <StatsTab clientId={clientId} />}
    </div>
  );
}

/* ==================== ORDERS TAB ==================== */

function OrdersTab({ clientId }: { clientId: number }) {
  const [page, setPage] = useState(1);
  const { data, status } = useOrders({ clientId }, page);

  const orders = useMemo(
    () => data?.edges.map((edge) => edge.node) ?? [],
    [data],
  );

  const columns: DataTableColumn<OrderListItem>[] = [
    {
      header: "Unidade",
      className: "w-32",
      cell: (o) => (
        <span className="font-medium">{o.unitName ?? "—"}</span>
      ),
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
      header: "Criado em",
      className: "w-32 text-center",
      cell: (o) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDate(o.createdAt)}
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
      cell: (o) => <ProductTags items={o.items} />,
    },
  ];

  if (status === "pending") {
    return <Skeleton className="h-72 rounded-lg" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(o) => String(o.id)}
        emptyText="Nenhum pedido deste cliente."
        onRowClick={(o) => (window.location.href = `/orders/${o.id}?returnTo=${encodeURIComponent(`/clients/${clientId}`)}`)}
        tableClassName="md:table-fixed"
      />
      <PagePagination page={page} totalCount={data?.totalCount ?? 0} pageSize={30} onPageChange={setPage} />
    </div>
  );
}

/* ==================== STATS TAB ==================== */

function StatsTab({ clientId }: { clientId: number }) {
  const { data: stats, status } = useClientStats(clientId);
  const [monthView, setMonthView] = useState<"total" | "unit">("total");

  // Transform per-unit monthly series into stacked format: [{month, [unitName]: count}]
  const { monthByUnitData, unitNames } = useMemo(() => {
    if (!stats || stats.ordersByMonthByUnit.length === 0) {
      return {
        monthByUnitData: [] as Record<string, unknown>[],
        unitNames: [] as string[],
      };
    }
    const names = Array.from(
      new Set(stats.ordersByMonthByUnit.map((r) => r.unitName)),
    );
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const r of stats.ordersByMonthByUnit) {
      if (!byMonth.has(r.month)) byMonth.set(r.month, { month: r.month });
      byMonth.get(r.month)![r.unitName] = r.count;
    }
    const data = Array.from(byMonth.values()).sort((a, b) =>
      String(a.month).localeCompare(String(b.month)),
    );
    return { monthByUnitData: data, unitNames: names };
  }, [stats]);
  const hasMultipleUnits = stats ? stats.ordersByUnit.length > 1 : false;

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
      {/* stat cards (2×2) + pie chart to the right (spans both rows) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* 2×2 grid of stat cards */}
        <div className="grid flex-1 grid-cols-2 gap-4">
          <StatCard label="Pedidos" value={formatNumber(stats.totalOrders)} />
          <StatCard label="Itens" value={formatNumber(stats.totalItems)} />
          <StatCard
            label="Ranking"
            value={stats.rank ? `#${stats.rank}` : "—"}
          />
          <StatCard
            label="Último pedido"
            value={stats.lastOrderDate ? formatDate(stats.lastOrderDate) : "—"}
          />
        </div>

        {/* pie chart for orders by unit (only when 2+ units) */}
        {stats.ordersByUnit.length > 1 && (
          <Card className="p-4 lg:w-72">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pedidos por unidade
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats.ordersByUnit}
                  dataKey="count"
                  nameKey="unitName"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {stats.ordersByUnit.map((unit) => (
                    <Cell
                      key={unit.unitName}
                      fill={chartColor(unit.unitName)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<PieTooltip />}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* legend below pie */}
            <div className="mt-2 flex flex-col gap-1">
              {stats.ordersByUnit.map((u) => (
                <div
                  key={u.unitName}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: chartColor(u.unitName),
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {u.unitName}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {u.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* orders by month */}
      {stats.ordersByMonth.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pedidos por mês
            </h3>
            {hasMultipleUnits && (
              <div className="flex rounded-lg border p-0.5">
                {[
                  { key: "total" as const, label: "Geral" },
                  { key: "unit" as const, label: "Por unidade" },
                ].map((opt) => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={monthView === opt.key ? "default" : "ghost"}
                    onClick={() => setMonthView(opt.key)}
                    className="rounded-md px-2.5 py-1 text-xs"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            {monthView === "total" ? (
              <LineChart data={stats.ordersByMonth}>
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
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={<MonthTooltip />}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS[0] }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <BarChart data={monthByUnitData}>
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
                  cursor={{ fill: CURSOR_FILL }}
                  content={<MonthByUnitTooltip />}
                  contentStyle={TOOLTIP_STYLE}
                />
                {unitNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="units"
                    fill={chartColor(name)}
                    radius={
                      i === unitNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      {/* top products (full width when alone) */}
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
              <Tooltip
                cursor={{ fill: CURSOR_FILL }}
                content={<ItemsTooltip />}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="totalItems" radius={[0, 4, 4, 0]}>
                {stats.topProducts.map((product) => (
                  <Cell key={product.name} fill={chartColor(product.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
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

/** Shared Recharts tooltip styling — light gray background card */
const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
} as const;

const CURSOR_FILL = "var(--accent)";

/** Tooltip for monthly chart: "Outubro 2025 — XX pedidos" */
function MonthTooltip({
  active,
  payload,
}: ChartTooltipProps<{ month: string; count: number }>) {
  if (!active || !payload?.length) return null;
  const { month, count } = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--popover)",
        borderColor: "var(--border)",
        color: "var(--popover-foreground)",
      }}
    >
      <p className="font-medium">{formatMonthLabel(month)}</p>
      <p className="text-muted-foreground">
        {count} {count === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}

/** Tooltip for stacked monthly chart: "Outubro 2025" + per-unit breakdown */
function MonthByUnitTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps<Record<string, number>>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--popover)",
        borderColor: "var(--border)",
        color: "var(--popover-foreground)",
      }}
    >
      <p className="mb-1 font-medium">
        {formatMonthLabel(String(label ?? ""))} — {total}{" "}
        {total === 1 ? "pedido" : "pedidos"}
      </p>
      <div className="flex flex-col gap-0.5">
        {payload
          .filter((entry) => (entry.value ?? 0) > 0)
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="flex-1">{entry.dataKey}</span>
              <span className="tabular-nums text-muted-foreground">
                {entry.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/** Tooltip for top products: "{name} — XX itens" */
function ItemsTooltip({
  active,
  payload,
}: ChartTooltipProps<{ name: string; totalItems: number }>) {
  if (!active || !payload?.length) return null;
  const { name, totalItems } = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--popover)",
        borderColor: "var(--border)",
        color: "var(--popover-foreground)",
      }}
    >
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">
        {formatNumber(totalItems)} {totalItems === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}

/** Tooltip for pie chart: "{unitName} — XX pedidos" */
function PieTooltip({
  active,
  payload,
}: ChartTooltipProps<{ unitName: string; count: number }>) {
  if (!active || !payload?.length) return null;
  const { unitName, count } = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--popover)",
        borderColor: "var(--border)",
        color: "var(--popover-foreground)",
      }}
    >
      <p className="font-medium">{unitName}</p>
      <p className="text-muted-foreground">
        {count} {count === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}
