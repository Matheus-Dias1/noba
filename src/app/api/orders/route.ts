import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Order } from "@/models/order";
import { Batch } from "@/models/batch";
import "@/models/product"; // side-effect: register the Product schema for `.populate("Product")`
import { decodeCursor, buildPage } from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/orders — paginated list of non-archived orders (newest first),
 * with optional filtering.
 *
 * Ported from the original `resolvers/orders.ts` (cursor `$lt` on `_id`, sort
 * `_id: -1`, page size 30, populates items.product + batch). The original's
 * `?search=<batchNumber>` filter was broken (it matched an int against the
 * batch ObjectId, so it never matched). Filtering is reimplemented properly:
 *   ?batch=<batchId>   — exact match on the order's batch
 *   ?client=<text>     — case-insensitive regex on client name
 *   ?from=<YYYY-MM-DD> — deliverAt >= from (inclusive)
 *   ?to=<YYYY-MM-DD>   — deliverAt <= to (inclusive, end of day)
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { afterCursor, batch, client, from, to } = Object.fromEntries(
      req.nextUrl.searchParams,
    );

    const searchFilter: Record<string, unknown> = { archived: false };
    if (batch) {
      searchFilter.batch = new mongoose.Types.ObjectId(batch);
    }
    if (client) {
      searchFilter.client = new RegExp(client, "i");
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(`${from}T00:00:00`);
      if (to) range.$lte = new Date(`${to}T23:59:59`);
      searchFilter.deliverAt = range;
    }

    const cursorFilters: Record<string, unknown> = afterCursor
      ? { _id: { $lt: decodeCursor(afterCursor) } }
      : {};

    let items = await Order.find({ $and: [cursorFilters, searchFilter] })
      .limit(DEFAULT_PAGE_SIZE + 1)
      .populate({
        path: "items",
        populate: { path: "item", model: "Product", select: "-_id" },
      })
      .populate({ path: "batch", model: "Batch", select: "_id number" })
      .sort({ _id: -1 });

    const hasNextPage = items.length > DEFAULT_PAGE_SIZE;
    if (hasNextPage) items = items.slice(0, DEFAULT_PAGE_SIZE);

    const totalCount = await Order.countDocuments(searchFilter);
    return NextResponse.json(buildPage(items, hasNextPage, totalCount));
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/orders — create a new order.
 * Ported verbatim, including the denormalized push into `Batch.orders` (see
 * PAGES_EXTRACTION.md §10 #4 — carried over for the port).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { client, batch, deliverAt, items } = (await req.json()) as {
      client?: string;
      batch?: string;
      deliverAt?: string;
      items?: { item: string; amount: number; measurementUnit: string }[];
    };

    if (!client || !batch || !deliverAt || !items) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      ...item,
      item: new mongoose.Types.ObjectId(item.item),
    }));

    const created = await new Order({
      client,
      deliverAt,
      items: normalizedItems,
      batch,
      createdAt: new Date(),
      archived: false,
    }).save();

    // denormalized back-reference (carried over from the original)
    await Batch.findByIdAndUpdate(batch, { $push: { orders: created.id } });

    return NextResponse.json({ id: String(created._id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
