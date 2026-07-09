import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clientContacts } from "@/db/schema/client-contacts";
import { requireSession } from "@/lib/auth";

/** PUT /api/client-contacts/:id — update a contact. */
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
      await db.update(clientContacts).set(patch).where(eq(clientContacts.id, numId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-contacts/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/client-contacts/:id — hard delete (contacts have no archive flag). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.delete(clientContacts).where(eq(clientContacts.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-contacts/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
