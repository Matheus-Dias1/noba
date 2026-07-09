import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, ilike, lt, not, or, sql, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema/orders";
import { batches } from "@/db/schema/batches";
import { products } from "@/db/schema/products";
import { clientUnits } from "@/db/schema/client-units";
import { clients } from "@/db/schema/clients";
import { decodeCursor, buildPage } from "@/db/pagination";
import { requireSession } from "@/lib/auth";
import { forceDateDay } from "@/lib/format";

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/orders — paginated list of non-archived orders (newest first), with
 * optional filtering by batch / client / deliverAt range.
 *
 * Each node carries its items + product + batch + client unit populated. We
 * aggregate the item lines per order with a JSON subquery so we get the whole
 * list in one round-trip.
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { afterCursor, batch, client, from, to } = Object.fromEntries(
      req.nextUrl.searchParams,
    );

    const conds: SQL[] = [not(orders.archived)];
    if (batch) conds.push(eq(orders.batchId, Number(batch)));
    if (from) conds.push(gte(orders.deliverAt, new Date(`${from}T00:00:00`)));
    if (to) conds.push(lte(orders.deliverAt, new Date(`${to}T23:59:59`)));
    // client search matches EITHER the client name OR the unit name (OR)
    if (client) {
      const clientCond = or(ilike(clients.name, `%${client}%`), ilike(clientUnits.name, `%${client}%`));
      if (clientCond) conds.push(clientCond);
    }
    if (afterCursor) conds.push(lt(orders.id, decodeCursor(afterCursor)));

    // base list (joined to batch + client_unit + client for display + filtering)
    const rows = await db
      .select({
        id: orders.id,
        clientSnapshot: orders.clientSnapshot,
        observation: orders.observation,
        createdAt: orders.createdAt,
        deliverAt: orders.deliverAt,
        status: orders.status,
        batchId: batches.id,
        batchNumber: batches.number,
        clientUnitId: clientUnits.id,
        clientUnitName: clientUnits.name,
        clientName: clients.name,
      })
      .from(orders)
      .innerJoin(batches, eq(batches.id, orders.batchId))
      .leftJoin(clientUnits, eq(clientUnits.id, orders.clientUnitId))
      .leftJoin(clients, eq(clients.id, clientUnits.clientId))
      .where(and(...conds))
      .orderBy(desc(orders.id))
      .limit(DEFAULT_PAGE_SIZE + 1);
    const hasNextPage = rows.length > DEFAULT_PAGE_SIZE;
    const trimmed = hasNextPage ? rows.slice(0, DEFAULT_PAGE_SIZE) : rows;

    // fetch items for these orders in one query
    const orderIds = trimmed.map((r) => r.id);
    const items =
      orderIds.length > 0
        ? await db
            .select({
              orderId: orderItems.orderId,
              amount: orderItems.amount,
              unit: orderItems.unit,
              productId: products.id,
              productDescription: products.description,
              productDefaultUnit: products.defaultUnit,
            })
            .from(orderItems)
            .innerJoin(products, eq(products.id, orderItems.productId))
            .where(sql`${orderItems.orderId} = ANY(${orderIds})`)
        : [];

    // group items by order
    const itemsByOrder = new Map<number, typeof items>();
    for (const it of items) {
      if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
      itemsByOrder.get(it.orderId)!.push(it);
    }

    const nodes = trimmed.map((r) => ({
      id: r.id,
      client: r.clientSnapshot ?? (r.clientName ? `${r.clientName}${r.clientUnitName ? " - " + r.clientUnitName : ""}` : ""),
      observation: r.observation,
      createdAt: r.createdAt,
      deliverAt: r.deliverAt,
      status: r.status,
      batch: { id: r.batchId, number: r.batchNumber },
      clientUnitId: r.clientUnitId,
      items: (itemsByOrder.get(r.id) ?? []).map((it) => ({
        amount: Number(it.amount),
        measurementUnit: it.unit,
        item: { description: it.productDescription, defaultMeasurementUnit: it.productDefaultUnit },
      })),
    }));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .innerJoin(clientUnits, eq(clientUnits.id, orders.clientUnitId))
      .innerJoin(clients, eq(clients.id, clientUnits.clientId))
      .where(and(...conds));

    return NextResponse.json(buildPage(nodes as unknown as { id: number }[], hasNextPage, count));
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/orders — create a new order.
 * Carries over the denormalized client_snapshot (the original client string, for audit).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { client, batch, deliverAt, items } = (await req.json()) as {
      client?: string;
      batch?: string;
      deliverAt?: string;
      items?: { item: string; amount: number; measurementUnit: string }[];
    };

    if (!client || !batch || !deliverAt || !items) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const [created] = await db
      .insert(orders)
      .values({
        batchId: Number(batch),
        clientSnapshot: client, // kept for audit until client_unit linkage is resolved
        deliverAt: forceDateDay(deliverAt),
        createdAt: new Date(),
        status: "active",
        archived: false,
      })
      .returning({ id: orders.id });

    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map((it) => ({
          orderId: created.id,
          productId: Number(it.item),
          amount: String(it.amount),
          unit: it.measurementUnit,
        })),
      );
    }

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
