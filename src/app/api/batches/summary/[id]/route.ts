import { NextResponse, type NextRequest } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { batches } from "@/db/schema/batches";
import { orders } from "@/db/schema/orders";
import { orderItems } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { productConversions } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/**
 * GET /api/batches/summary/:id — one batch fully populated (orders + items +
 * products). Same shaping approach as the summary list.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [batchRow] = await db
      .select({
        id: batches.id,
        number: batches.number,
        startDate: batches.startDate,
        endDate: batches.endDate,
      })
      .from(batches)
      .where(eq(batches.id, numId));

    if (!batchRow) return NextResponse.json(null, { status: 404 });

    const orderRows = await db
      .select({
        id: orders.id,
        client: orders.clientSnapshot,
        observation: orders.observation,
        status: orders.status,
        createdAt: orders.createdAt,
        deliverAt: orders.deliverAt,
      })
      .from(orders)
      .where(eq(orders.batchId, numId))
      .orderBy(desc(orders.id));

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

    const itemsByOrder = new Map<number, typeof itemRows>();
    for (const r of itemRows) {
      if (!itemsByOrder.has(r.orderId)) itemsByOrder.set(r.orderId, []);
      itemsByOrder.get(r.orderId)!.push(r);
    }

    const result = {
      id: batchRow.id,
      number: batchRow.number,
      startDate: batchRow.startDate,
      endDate: batchRow.endDate,
      orders: orderRows.map((o) => ({
        id: o.id,
        client: o.client,
        observation: o.observation,
        status: o.status,
        createdAt: o.createdAt,
        deliverAt: o.deliverAt,
        items: shapeItems(itemsByOrder.get(o.id) ?? []),
      })),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches/summary/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

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
