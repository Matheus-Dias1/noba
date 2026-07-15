import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db/client";
import { clientUnits } from "@/db/schema/client-units";
import { requireSession } from "@/lib/auth";

/**
 * GET /api/clients/:id/stats — aggregated stats for the stats tab.
 * Uses raw Neon sql() for the aggregation queries (avoids Drizzle's
 * db.execute() result-shape incompatibility with the HTTP driver).
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
        ordersByMonthByUnit: [],
        topProducts: [],
        ordersByUnit: [],
      });
    }

    // raw Neon sql() for aggregations (returns plain rows[])
    const sqlRaw = neon(process.env.DATABASE_URL!);
    const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(",");
    const totalRows = await sqlRaw.query(
      `SELECT count(*)::int AS total_orders, max(created_at) AS last_order FROM orders WHERE client_unit_id IN (${placeholders})`,
      unitIds,
    );

    const itemCountRows = await sqlRaw.query(
      `SELECT count(*)::int AS total FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.client_unit_id IN (${placeholders})`,
      unitIds,
    );

    const rankRows = await sqlRaw.query(
      `WITH client_order_counts AS (
        SELECT c.id, count(o.id)::int AS cnt
        FROM clients c
        JOIN client_units cu ON cu.client_id = c.id
        JOIN orders o ON o.client_unit_id = cu.id
        WHERE o.archived = false
        GROUP BY c.id
      )
      SELECT count(*)::int + 1 AS rank
      FROM client_order_counts
      WHERE cnt > (SELECT cnt FROM client_order_counts WHERE id = $1)`,
      [clientId],
    );

    const monthRows = await sqlRaw.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
       FROM orders WHERE client_unit_id IN (${placeholders}) AND archived = false
       GROUP BY 1 ORDER BY 1`,
      unitIds,
    );

    const productRows = await sqlRaw.query(
      `SELECT p.description AS name, count(*)::int AS total_items
       FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
       WHERE o.client_unit_id IN (${placeholders}) AND o.archived = false
       GROUP BY p.description ORDER BY total_items DESC LIMIT 10`,
      unitIds,
    );

    const unitRows = await sqlRaw.query(
      `SELECT cu.name AS unit_name, count(o.id)::int AS count
       FROM client_units cu JOIN orders o ON o.client_unit_id = cu.id
       WHERE cu.client_id = $1 AND o.archived = false
       GROUP BY cu.name ORDER BY count DESC`,
      [clientId],
    );

    // per-unit monthly series for the "Por unidade" toggle on the monthly chart
    const monthByUnitRows = await sqlRaw.query(
      `SELECT to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
              cu.id AS unit_id, cu.name AS unit_name,
              count(o.id)::int AS count
       FROM orders o JOIN client_units cu ON cu.id = o.client_unit_id
       WHERE o.client_unit_id IN (${placeholders}) AND o.archived = false
       GROUP BY 1, cu.id, cu.name
       ORDER BY 1, cu.name`,
      unitIds,
    );

    return NextResponse.json({
      totalOrders: totalRows[0]?.total_orders ?? 0,
      totalItems: itemCountRows[0]?.total ?? 0,
      lastOrderDate: totalRows[0]?.last_order ?? null,
      rank: rankRows[0]?.rank ?? null,
      ordersByMonth: monthRows.map((r: Record<string, unknown>) => ({
        month: r.month as string,
        count: r.count as number,
      })),
      ordersByMonthByUnit: monthByUnitRows.map((r: Record<string, unknown>) => ({
        month: r.month as string,
        unitId: r.unit_id as number,
        unitName: r.unit_name as string,
        count: r.count as number,
      })),
      topProducts: productRows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        totalItems: r.total_items as number,
      })),
      ordersByUnit: unitRows.map((r: Record<string, unknown>) => ({
        unitName: r.unit_name as string,
        count: r.count as number,
      })),
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients/:id/stats GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
