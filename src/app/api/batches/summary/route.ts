import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { batches } from "@/db/schema/batches";
import { orders } from "@/db/schema/orders";
import { orderItems } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { productConversions } from "@/db/schema/products";
import { decodeCursor, buildPage } from "@/db/pagination";
import { requireSession } from "@/lib/auth";

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/batches/summary — paginated batches with their orders + items +
 * products. Unlike the Mongo version (deep populate → huge payload + the
 * pimenta bode bug), here we do targeted joins and shape the nested structure
 * in JS. The wire shape matches what the frontend expects.
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { afterCursor, search } = Object.fromEntries(req.nextUrl.searchParams);

    const conds = [];
    if (afterCursor) conds.push(lt(batches.id, decodeCursor(afterCursor)));
    if (search) {
      const n = parseInt(search, 10);
      if (!Number.isNaN(n)) conds.push(eq(batches.number, n));
    }

    const batchRows = await db
      .select({
        id: batches.id,
        number: batches.number,
        startDate: batches.startDate,
        endDate: batches.endDate,
      })
      .from(batches)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(batches.id))
      .limit(DEFAULT_PAGE_SIZE + 1);

    const hasNextPage = batchRows.length > DEFAULT_PAGE_SIZE;
    const trimmed = hasNextPage ? batchRows.slice(0, DEFAULT_PAGE_SIZE) : batchRows;
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(batches);

    if (trimmed.length === 0) return NextResponse.json(buildPage([], false, count));

    // orders for these batches
    const batchIds = trimmed.map((b) => b.id);
    const orderRows = await db
      .select({
        id: orders.id,
        batchId: orders.batchId,
        client: orders.clientSnapshot,
        observation: orders.observation,
        status: orders.status,
        createdAt: orders.createdAt,
        deliverAt: orders.deliverAt,
      })
      .from(orders)
      .where(sql`${orders.batchId} = ANY(${batchIds})`)
      .orderBy(desc(orders.id));

    // items for these orders (with product + conversions)
    const orderIds = orderRows.map((o) => o.id);
    const itemRows =
      orderIds.length > 0
        ? await db
            .select({
              orderId: orderItems.orderId,
              amount: orderItems.amount,
              unit: orderItems.unit,
              productId: products.id,
              productDescription: products.description,
              productDefaultUnit: products.defaultUnit,
              convUnit: productConversions.unit,
              convFactor: productConversions.oneDefaultEquals,
            })
            .from(orderItems)
            .innerJoin(products, eq(products.id, orderItems.productId))
            .leftJoin(productConversions, eq(productConversions.productId, products.id))
            .where(sql`${orderItems.orderId} = ANY(${orderIds})`)
        : [];

    // shape: batch → orders[] → items[] with product + conversions[]
    const itemsByOrder = groupBy(itemRows, (r) => r.orderId);
    const ordersByBatch = groupBy(orderRows, (r) => r.batchId);

    const nodes = trimmed.map((b) => ({
      id: b.id,
      number: b.number,
      startDate: b.startDate,
      endDate: b.endDate,
      orders: (ordersByBatch.get(b.id) ?? []).map((o) => ({
        id: o.id,
        client: o.client,
        observation: o.observation,
        status: o.status,
        createdAt: o.createdAt,
        deliverAt: o.deliverAt,
        items: shapeItems(itemsByOrder.get(o.id) ?? []),
      })),
    }));

    return NextResponse.json(buildPage(nodes, hasNextPage, count));
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches/summary GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** Group an array by a key. */
function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}

/** Collapse the left-joined item+conversion rows into items with embedded product. */
function shapeItems(
  rows: {
    amount: string;
    unit: string;
    productId: number;
    productDescription: string;
    productDefaultUnit: string;
    convUnit: string | null;
    convFactor: string | null;
  }[],
) {
  const prodMap = new Map<
    number,
    { id: number; description: string; defaultMeasurementUnit: string; conversions: { measurementUnit: string; oneDefaultEquals: number }[] }
  >();
  const lines: { amount: number; measurementUnit: string; product: number }[] = [];

  for (const r of rows) {
    if (!prodMap.has(r.productId)) {
      prodMap.set(r.productId, {
        id: r.productId,
        description: r.productDescription,
        defaultMeasurementUnit: r.productDefaultUnit,
        conversions: [],
      });
      lines.push({ amount: Number(r.amount), measurementUnit: r.unit, product: r.productId });
    }
    if (r.convUnit) {
      prodMap.get(r.productId)!.conversions.push({
        measurementUnit: r.convUnit,
        oneDefaultEquals: Number(r.convFactor),
      });
    }
  }

  return lines.map((l) => ({
    amount: l.amount,
    measurementUnit: l.measurementUnit,
    item: prodMap.get(l.product)!,
  }));
}
