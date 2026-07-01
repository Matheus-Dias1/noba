import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Batch } from "@/models/batch";
import { decodeCursor, buildPage } from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/batches — paginated list of batches (newest first), light payload
 * (number + dates). Ported from the original `resolvers/batches.ts`.
 *
 * `?search=` filters by exact batch number (carried over from the original,
 * which parsed it as an int). The original /batches was used only for the batch
 * picker labels, so it doesn't populate orders.
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
      .select(["number", "startDate", "endDate"]);

    const hasNextPage = items.length > DEFAULT_PAGE_SIZE;
    if (hasNextPage) items = items.slice(0, DEFAULT_PAGE_SIZE);

    const totalCount = await Batch.countDocuments();
    return NextResponse.json(buildPage(items, hasNextPage, totalCount));
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/batches — create a new batch.
 * Ported verbatim, including the racy `countDocuments() + 1` numbering
 * (§10 #5 — carried over for the port).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { startDate, endDate } = (await req.json()) as {
      startDate?: string;
      endDate?: string;
    };

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const nextBatch = (await Batch.countDocuments()) + 1;
    const created = await new Batch({ startDate, endDate, number: nextBatch }).save();

    return NextResponse.json({ id: String(created._id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
