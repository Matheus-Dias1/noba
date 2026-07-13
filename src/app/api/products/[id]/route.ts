import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, productConversions, productProcessings } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";
import type { Product as ProductT } from "@/types";

/** GET /api/products/:id — single product with conversions. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const rows = await db
      .select()
      .from(products)
      .where(eq(products.id, numId))
      .leftJoin(productConversions, eq(productConversions.productId, products.id));

    if (rows.length === 0) return NextResponse.json(null, { status: 404 });

    const p = rows[0].products;
    const product: ProductT = {
      id: String(p.id),
      description: p.description,
      defaultMeasurementUnit: p.defaultUnit,
      conversions: [],
      processings: [],
      archived: p.archived,
    };
    for (const r of rows) {
      if (r.product_conversions) {
        product.conversions.push({
          measurementUnit: r.product_conversions.unit,
          oneDefaultEquals: Number(r.product_conversions.oneDefaultEquals),
        });
      }
    }
    // fetch processings for this product
    const procRows = await db
      .select()
      .from(productProcessings)
      .where(eq(productProcessings.productId, numId));
    for (const pr of procRows) {
      product.processings.push({ id: String(pr.id), name: pr.name });
    }
    return NextResponse.json(product);
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * PUT /api/products/:id — partial update. Updates the product fields and/or
 * replaces the full conversions array (if provided).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { description, defaultMeasurementUnit, conversions, processings } = (await req.json()) as {
      description?: string;
      defaultMeasurementUnit?: string;
      conversions?: ProductT["conversions"];
      processings?: { id?: string; name: string }[];
    };

    if (description) await db.update(products).set({ description }).where(eq(products.id, numId));
    if (defaultMeasurementUnit)
      await db.update(products).set({ defaultUnit: defaultMeasurementUnit }).where(eq(products.id, numId));

    if (conversions) {
      // replace the full set
      await db.delete(productConversions).where(eq(productConversions.productId, numId));
      if (conversions.length > 0) {
        await db.insert(productConversions).values(
          conversions.map((c) => ({
            productId: numId,
            unit: c.measurementUnit,
            oneDefaultEquals: String(c.oneDefaultEquals),
          })),
        );
      }
    }

    if (processings) {
      // replace the full set
      await db.delete(productProcessings).where(eq(productProcessings.productId, numId));
      if (processings.length > 0) {
        await db.insert(productProcessings).values(
          processings.map((pr) => ({
            productId: numId,
            name: pr.name.toUpperCase(),
          })),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/products/:id — soft-delete (sets archived: true). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.update(products).set({ archived: true }).where(eq(products.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
