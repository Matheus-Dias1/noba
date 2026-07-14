import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clientUnits } from "@/db/schema/client-units";
import { orders } from "@/db/schema/orders";
import { orderItems } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/**
 * GET /api/clients/:id/stats — aggregated stats for the stats tab.
 *
 * Returns:
 *  - totalOrders, totalItems, lastOrderDate, rank
 *  - ordersByMonth: [{ month: "2024-01", count: N }]
 *  - topProducts: [{ name, totalItems }] (top 10 by order-item count)
 *  - ordersByUnit: [{ unitName, count }]
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const clientId = Number(id);
    if (Number.isNaN(clientId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    // get all unit ids for this client
    const units = await db
      .select({ id: clientUnits.id, name: clientUnits.name })
      .from(clientUnits)
      .where(eq(clientUnits.clientId, clientId));
    const unitIds = units.map((u) => u.id);
    if (unitIds.length === 0) {
      return NextResponse.json({
        totalOrders: 0,
        totalItems: 0,
        lastOrderDate: null,
        rank: null,
        ordersByMonth: [],
        topProducts: [],
        ordersByUnit: [],
      });
    }

    // total orders + last order date
    const [totals] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        lastOrder: sql<Date>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(sql`${orders.clientUnitId} = ANY(${unitIds})`);

    // total items
    const [itemsCount] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(sql`${orders.clientUnitId} = ANY(${unitIds})`);

    // rank: how many clients have more orders
    const rankRows = await db.execute(sql`
      WITH client_order_counts AS (
        SELECT c.id, count(o.id)::int AS cnt
        FROM clients c
        JOIN client_units cu ON cu.client_id = c.id
        JOIN orders o ON o.client_unit_id = cu.id
        WHERE o.archived = false
        GROUP BY c.id
      )
      SELECT count(*)::int + 1 AS rank
      FROM client_order_counts
      WHERE cnt > (SELECT cnt FROM client_order_counts WHERE id = ${clientId})
    `);
    const rankRowsArr = rankRows as unknown as Record<string, unknown>[];
    const rank = rankRowsArr[0]?.rank ?? null;

    // orders by month
    const monthRows = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', ${orders.createdAt}), 'YYYY-MM') AS month,
        count(*)::int AS count
      FROM ${orders}
      WHERE ${orders.clientUnitId} = ANY(${unitIds}) AND ${orders.archived} = false
      GROUP BY 1
      ORDER BY 1
    `);

    // top products by line count (top 10)
    const productRows = await db.execute(sql`
      SELECT p.description AS name, count(*)::int AS total_items
      FROM ${orderItems} oi
      JOIN ${orders} o ON o.id = oi.order_id
      JOIN ${products} p ON p.id = oi.product_id
      WHERE ${orders.clientUnitId} = ANY(${unitIds}) AND o.archived = false
      GROUP BY p.description
      ORDER BY total_items DESC
      LIMIT 10
    `);

    // orders by unit
    const unitRows = await db.execute(sql`
      SELECT cu.name AS unit_name, count(o.id)::int AS count
      FROM ${clientUnits} cu
      JOIN ${orders} o ON o.client_unit_id = cu.id
      WHERE cu.client_id = ${clientId} AND o.archived = false
      GROUP BY cu.name
      ORDER BY count DESC
    `);

    return NextResponse.json({
      totalOrders: totals.totalOrders,
      totalItems: itemsCount.total,
      lastOrderDate: totals.lastOrder,
      rank,
      ordersByMonth: (monthRows as unknown as Record<string, unknown>[]).map((r) => ({ month: r.month as string, count: r.count as number })),
      topProducts: (productRows as unknown as Record<string, unknown>[]).map((r) => ({ name: r.name as string, totalItems: r.total_items as number })),
      ordersByUnit: (unitRows as unknown as Record<string, unknown>[]).map((r) => ({ unitName: r.unit_name as string, count: r.count as number })),
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients/:id/stats GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
