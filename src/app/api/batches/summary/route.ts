import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Batch } from "@/models/batch";
import { decodeCursor, buildPage } from "@/lib/pagination";
import { normalize } from "@/lib/normalize";
import "@/models/order"; // register Order schema for populate
import "@/models/product"; // register Product schema for nested populate

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/batches/summary — paginated batches with all orders + nested items
 * + products populated (heavy payload; carried over from the original for the
 * faithful port). Used by the Batches list cards. Newest first.
 *
 * Results are passed through `normalize()` because Mongoose's `toJSON` transform
 * doesn't reach populated refs nested inside subdocument arrays, which would
 * otherwise surface as Mongoose Documents missing a stable `id` and break the
 * client-side grouping (see PAGES_EXTRACTION.md — the pimenta bode sum bug).
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { afterCursor, search } = Object.fromEntries(req.nextUrl.searchParams);

    const cursorFilters: Record<string, unknown> = afterCursor
      ? { _id: { $lt: decodeCursor(afterCursor) } }
      : {};

    const filters: Record<string, unknown> = { ...cursorFilters };
    if (search) {
      const n = parseInt(search, 10);
      if (!Number.isNaN(n)) Object.assign(filters, { number: n });
    }

    let items = await Batch.find(filters)
      .limit(DEFAULT_PAGE_SIZE + 1)
      .sort({ _id: -1 })
      .populate({
        path: "orders",
        model: "Order",
        select: "-batch",
        populate: { path: "items", populate: { path: "item", model: "Product" } },
      });

    const hasNextPage = items.length > DEFAULT_PAGE_SIZE;
    if (hasNextPage) items = items.slice(0, DEFAULT_PAGE_SIZE);

    const normalized = normalize<{ id: string }[]>(items);
    const totalCount = await Batch.countDocuments();
    return NextResponse.json(buildPage(normalized, hasNextPage, totalCount));
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches/summary GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
