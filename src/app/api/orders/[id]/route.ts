import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema/orders";
import { batches } from "@/db/schema/batches";
import { products } from "@/db/schema/products";
import { productConversions, productProcessings } from "@/db/schema/products";
import { clientUnits } from "@/db/schema/client-units";
import { clients } from "@/db/schema/clients";
import { requireSession } from "@/lib/auth";
import { forceDateDay } from "@/lib/format";

/** GET /api/orders/:id — single order, fully populated. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [orderRow] = await db
      .select({
        id: orders.id,
        clientSnapshot: orders.clientSnapshot,
        observation: orders.observation,
        createdAt: orders.createdAt,
        deliverAt: orders.deliverAt,
        status: orders.status,
        archived: orders.archived,
        batchId: batches.id,
        batchNumber: batches.number,
        batchStart: batches.startDate,
        batchEnd: batches.endDate,
        clientUnitId: clientUnits.id,
        clientId: clients.id,
        clientUnitName: clientUnits.name,
        clientName: clients.name,
      })
      .from(orders)
      .innerJoin(batches, eq(batches.id, orders.batchId))
      .leftJoin(clientUnits, eq(clientUnits.id, orders.clientUnitId))
      .leftJoin(clients, eq(clients.id, clientUnits.clientId))
      .where(eq(orders.id, numId));

    if (!orderRow) return NextResponse.json(null, { status: 404 });

    // items with product + conversions + processing
    const itemRows = await db
      .select({
        amount: orderItems.amount,
        unit: orderItems.unit,
        processingId: orderItems.processingId,
        productId: products.id,
        productDescription: products.description,
        productDefaultUnit: products.defaultUnit,
        convUnit: productConversions.unit,
        convFactor: productConversions.oneDefaultEquals,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(productConversions, eq(productConversions.productId, products.id))
      .where(eq(orderItems.orderId, numId));

    // collapse conversions into the product
    const prodMap = new Map<number, { id: number; description: string; defaultMeasurementUnit: string; conversions: { measurementUnit: string; oneDefaultEquals: number }[]; processings: { id: number; name: string }[] }>();
    const lineOrder: { amount: number; measurementUnit: string; processingId: number | null; product: number }[] = [];
    for (const r of itemRows) {
      if (!prodMap.has(r.productId)) {
        prodMap.set(r.productId, {
          id: r.productId,
          description: r.productDescription,
          defaultMeasurementUnit: r.productDefaultUnit,
          conversions: [],
          processings: [],
        });
        lineOrder.push({ amount: Number(r.amount), measurementUnit: r.unit, processingId: r.processingId, product: r.productId });
      }
      if (r.convUnit) {
        prodMap.get(r.productId)!.conversions.push({
          measurementUnit: r.convUnit,
          oneDefaultEquals: Number(r.convFactor),
        });
      }
    }

    const productIds = [...prodMap.keys()];
    if (productIds.length > 0) {
      const processingRows = await db
        .select()
        .from(productProcessings)
        .where(inArray(productProcessings.productId, productIds));
      for (const processing of processingRows) {
        prodMap.get(processing.productId)?.processings.push({ id: processing.id, name: processing.name });
      }
    }

    return NextResponse.json({
      id: orderRow.id,
      client: orderRow.clientSnapshot ?? (orderRow.clientName ? `${orderRow.clientName}${orderRow.clientUnitName ? " - " + orderRow.clientUnitName : ""}` : ""),
      clientName: orderRow.clientName,
      unitName: orderRow.clientUnitName,
      observation: orderRow.observation,
      createdAt: orderRow.createdAt,
      deliverAt: orderRow.deliverAt,
      status: orderRow.status,
      archived: orderRow.archived,
      batch: {
        id: orderRow.batchId,
        number: orderRow.batchNumber,
        startDate: orderRow.batchStart,
        endDate: orderRow.batchEnd,
      },
      clientUnitId: orderRow.clientUnitId,
      clientId: orderRow.clientId,
      items: lineOrder.map((l) => ({
        amount: l.amount,
        measurementUnit: l.measurementUnit,
        processingId: l.processingId,
        item: prodMap.get(l.product)!,
      })),
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** PUT /api/orders/:id — partial update. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { clientUnitId, client, observation, batch, deliverAt, items } = (await req.json()) as {
      clientUnitId?: number | null;
      client?: string;
      observation?: string;
      batch?: string;
      deliverAt?: string;
      items?: { item: string; amount: number; measurementUnit: string; processingId?: number | null }[];
    };

    const patch: Record<string, unknown> = {};
    if (clientUnitId !== undefined) patch.clientUnitId = clientUnitId;
    if (client !== undefined) patch.clientSnapshot = client;
    if (observation !== undefined) patch.observation = observation || null;
    if (batch) patch.batchId = Number(batch);
    if (deliverAt) patch.deliverAt = forceDateDay(deliverAt);
    if (Object.keys(patch).length > 0) {
      await db.update(orders).set(patch).where(eq(orders.id, numId));
    }

    if (items) {
      await db.delete(orderItems).where(eq(orderItems.orderId, numId));
      if (items.length > 0) {
        await db.insert(orderItems).values(
          items.map((it) => ({
            orderId: numId,
            productId: Number(it.item),
            amount: String(it.amount),
            unit: it.measurementUnit,
            processingId: it.processingId ?? null,
          })),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/orders/:id — soft-delete (sets archived: true). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.update(orders).set({ archived: true }).where(eq(orders.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
