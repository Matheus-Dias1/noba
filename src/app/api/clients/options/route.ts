import { NextResponse, type NextRequest } from "next/server";
import { and, asc, ilike, not } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema/clients";
import { requireSession } from "@/lib/auth";

const PAGE_SIZE = 30;

/** Lightweight, paginated client options for async selectors. */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const search = req.nextUrl.searchParams.get("search")?.trim();
    const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);
    const conditions = [not(clients.archived)];
    if (search) conditions.push(ilike(clients.name, `%${search}%`));
    const rows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(...conditions))
      .orderBy(asc(clients.name), asc(clients.id))
      .offset(offset)
      .limit(PAGE_SIZE + 1);
    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    return NextResponse.json({
      options: pageRows.map((client) => ({ value: String(client.id), label: client.name })),
      hasMore,
      nextCursor: hasMore ? String(offset + PAGE_SIZE) : undefined,
    });
  } catch (error) {
    console.log("UNEXPECTED ERROR (clients/options GET):", error);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
