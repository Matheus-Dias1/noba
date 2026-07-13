import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts } from "@/db/schema/contacts";
import { requireSession } from "@/lib/auth";

/** PUT /api/contacts/:id — update a contact. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const body = (await req.json()) as { name?: string; role?: string; phone?: string; email?: string };
    const patch: Record<string, unknown> = {};
    for (const f of ["name", "role", "phone", "email"] as const) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (Object.keys(patch).length > 0) {
      await db.update(contacts).set(patch).where(eq(contacts.id, numId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (contacts/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/contacts/:id — hard delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.delete(contacts).where(eq(contacts.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (contacts/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
