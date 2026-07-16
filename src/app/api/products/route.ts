import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, ilike, inArray, sql, not } from "drizzle-orm";
import { db } from "@/db/client";
import { products, productConversions, productProcessings } from "@/db/schema/products";
import { decodeCursor, buildPage } from "@/db/pagination";
import { requireSession } from "@/lib/auth";
import type { Product as ProductT } from "@/types";

const DEFAULT_PAGE_SIZE = 29;

/**
 * GET /api/products — paginated list of non-archived products, with optional
 * case-insensitive `search` on description. Keyset pagination ascending on id.
 *
 * Shape matches the Mongo version: each node is the product with conversions
 * embedded as an array (joined here in one query).
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { search: pSearch, afterCursor } = Object.fromEntries(
      req.nextUrl.searchParams,
    );
    const searchQuery = pSearch ? pSearch.toString() : undefined;

    const conds = [not(products.archived)];
    if (searchQuery) conds.push(ilike(products.description, `%${searchQuery}%`));
    if (afterCursor) conds.push(gt(products.id, decodeCursor(afterCursor)));

    const rows = await db
      .select()
      .from(products)
      .where(and(...conds))
      .orderBy(products.id)
      .limit(DEFAULT_PAGE_SIZE + 1)
      .leftJoin(
        productConversions,
        eq(productConversions.productId, products.id),
      );

    const hasNextPage = rows.length > DEFAULT_PAGE_SIZE;
    const trimmed = hasNextPage ? rows.slice(0, DEFAULT_PAGE_SIZE) : rows;

    // collapse the left-join back into product + conversions[]
    const productMap = new Map<number, ProductT>();
    for (const r of trimmed) {
      const p = r.products;
      if (!productMap.has(p.id)) {
        productMap.set(p.id, {
          id: String(p.id),
          description: p.description,
          defaultMeasurementUnit: p.defaultUnit,
          conversions: [],
          processings: [],
          archived: p.archived,
        });
      }
      if (r.product_conversions) {
        productMap.get(p.id)!.conversions.push({
          measurementUnit: r.product_conversions.unit,
          oneDefaultEquals: Number(r.product_conversions.oneDefaultEquals),
        });
      }
    }

    // fetch processings for these products (separate query to avoid cartesian)
    const productIds = [...productMap.keys()];
    if (productIds.length > 0) {
      const procRows = await db
        .select()
        .from(productProcessings)
        .where(inArray(productProcessings.productId, productIds));
      for (const pr of procRows) {
        productMap.get(pr.productId)?.processings?.push({
          id: String(pr.id),
          name: pr.name,
        });
      }
    }

    const countConds = [not(products.archived)];
    if (searchQuery) countConds.push(ilike(products.description, `%${searchQuery}%`));
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...countConds));

    return NextResponse.json(buildPage([...productMap.values()], hasNextPage, count));
  } catch (err) {
    console.log("UNEXPECTED ERROR (products GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/products — create a new product (with conversions).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { description, defaultMeasurementUnit, conversions, processings } = (await req.json()) as {
      description?: string;
      defaultMeasurementUnit?: string;
      conversions?: ProductT["conversions"];
      processings?: { name: string }[];
    };

    if (!description || !defaultMeasurementUnit || !conversions) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const [created] = await db
      .insert(products)
      .values({ description, defaultUnit: defaultMeasurementUnit, archived: false })
      .returning({ id: products.id });

    if (conversions.length > 0) {
      await db.insert(productConversions).values(
        conversions.map((c) => ({
          productId: created.id,
          unit: c.measurementUnit,
          oneDefaultEquals: String(c.oneDefaultEquals),
        })),
      );
    }

    const createdProcessings = processings && processings.length > 0
      ? await db.insert(productProcessings).values(
        processings.map((p) => ({
          productId: created.id,
          name: p.name.toUpperCase(),
        })),
      ).returning({ id: productProcessings.id, name: productProcessings.name })
      : [];

    return NextResponse.json({
      id: String(created.id),
      description,
      defaultMeasurementUnit,
      conversions,
      processings: createdProcessings.map((processing) => ({ ...processing, id: String(processing.id) })),
      archived: false,
    }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
