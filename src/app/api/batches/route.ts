import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { batches } from "@/db/schema/batches";
import { decodeCursor, buildPage } from "@/db/pagination";
import { requireSession } from "@/lib/auth";

const DEFAULT_PAGE_SIZE = 30;

/**
 * GET /api/batches — paginated list (newest first), light payload.
 * `?search=` filters by exact batch number.
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

    const rows = await db
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

    const hasNextPage = rows.length > DEFAULT_PAGE_SIZE;
    const trimmed = hasNextPage ? rows.slice(0, DEFAULT_PAGE_SIZE) : rows;
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(batches);

    return NextResponse.json(buildPage(trimmed, hasNextPage, count));
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/batches — create a new batch.
 * Note: the original used `countDocuments() + 1` (racy). Postgres lets us do this
 * atomically with a subquery, fixing the race.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { startDate, endDate } = (await req.json()) as {
      startDate?: string;
      endDate?: string;
    };
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    // atomic next-number assignment (fixes the §10 #5 race)
    const [created] = await db
      .insert(batches)
      .values({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        number: sql`(SELECT COALESCE(MAX(${batches.number}), 0) + 1 FROM ${batches})`,
      })
      .returning({ id: batches.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
