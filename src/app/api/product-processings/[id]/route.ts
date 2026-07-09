import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productProcessings } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/** PUT /api/product-processings/:id — rename a processing option. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { name } = (await req.json()) as { name?: string };
    if (name) {
      await db
        .update(productProcessings)
        .set({ name: name.toUpperCase() })
        .where(eq(productProcessings.id, numId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (product-processings/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/product-processings/:id — hard delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.delete(productProcessings).where(eq(productProcessings.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (product-processings/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
