import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Product } from "@/models/product";
import { decodeCursor, buildPage } from "@/lib/pagination";
import type { Product as ProductT } from "@/types";

const DEFAULT_PAGE_SIZE = 29;

/**
 * GET /api/products — paginated list of non-archived products, with optional
 * case-insensitive `search` on description.
 *
 * Ported verbatim from the original `resolvers/products.ts`. Cursor direction is
 * `$gt` on `_id` (ascending), page size 29.
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { search: pSearch, afterCursor } = Object.fromEntries(
      req.nextUrl.searchParams,
    );

    const searchQuery = pSearch ? pSearch.toString() : undefined;
    const searchFilter = Object.assign(
      { archived: false },
      searchQuery ? { description: new RegExp(searchQuery, "i") } : null,
    );

    const cursorFilters: Record<string, unknown> = afterCursor
      ? { _id: { $gt: decodeCursor(afterCursor) } }
      : {};

    let items = await Product.find({ $and: [cursorFilters, searchFilter] }).limit(
      DEFAULT_PAGE_SIZE + 1,
    );

    const hasNextPage = items.length > DEFAULT_PAGE_SIZE;
    if (hasNextPage) items = items.slice(0, DEFAULT_PAGE_SIZE);

    const totalCount = await Product.countDocuments(searchFilter);
    return NextResponse.json(buildPage(items, hasNextPage, totalCount));
  } catch (err) {
    console.log("UNEXPECTED ERROR (products GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/products — create a new product.
 * Ported verbatim; `conversions` may be empty.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { description, defaultMeasurementUnit, conversions } = (await req.json()) as {
      description?: string;
      defaultMeasurementUnit?: string;
      conversions?: ProductT["conversions"];
    };

    if (!description || !defaultMeasurementUnit || !conversions) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const created = await new Product({
      description,
      defaultMeasurementUnit,
      conversions,
      archived: false,
    }).save();

    return NextResponse.json({ id: String(created._id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
