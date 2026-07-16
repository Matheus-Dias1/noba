import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clientUnits } from "@/db/schema/client-units";
import { requireSession } from "@/lib/auth";
import { isValidCnpj } from "@/lib/brazilian-documents";

/** PUT /api/client-units/:id — update a unit's fields. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const body = (await req.json()) as {
      name?: string;
      cnpj?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zip?: string;
      complement?: string;
    };

    const patch: Record<string, unknown> = {};
    if (body.cnpj !== undefined && !isValidCnpj(body.cnpj)) {
      return NextResponse.json({ error: "INVALID_CNPJ" }, { status: 400 });
    }
    if (body.name) patch.name = body.name.toUpperCase();
    for (const f of ["cnpj", "street", "number", "neighborhood", "city", "state", "zip", "complement"] as const) {
      if (body[f] !== undefined) patch[f] = body[f];
    }

    if (Object.keys(patch).length > 0) {
      await db.update(clientUnits).set(patch).where(eq(clientUnits.id, numId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-units/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/client-units/:id — soft-delete (archive). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.update(clientUnits).set({ archived: true }).where(eq(clientUnits.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-units/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
