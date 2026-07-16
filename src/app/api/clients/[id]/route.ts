import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema/clients";
import { clientUnits } from "@/db/schema/client-units";
import { contacts } from "@/db/schema/contacts";
import { requireSession } from "@/lib/auth";
import { isValidCnpj } from "@/lib/brazilian-documents";

/** GET /api/clients/:id — single client with units + contacts. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [client] = await db.select().from(clients).where(eq(clients.id, numId));
    if (!client) return NextResponse.json(null, { status: 404 });

    const units = await db.select().from(clientUnits).where(eq(clientUnits.clientId, numId));
    const contactsByUnit = new Map<number, typeof contacts.$inferSelect[]>();
    for (const u of units) {
      const cs = await db
        .select()
        .from(contacts)
        .where(eq(contacts.clientUnitId, u.id));
      contactsByUnit.set(u.id, cs);
    }

    return NextResponse.json({
      ...client,
      units: units.map((u) => ({ ...u, contacts: contactsByUnit.get(u.id) ?? [] })),
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * PUT /api/clients/:id — update client fields (name, legalName, cnpj).
 * Unit/contact management is via their own endpoints.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { name, legalName, cnpj } = (await req.json()) as {
      name?: string;
      legalName?: string;
      cnpj?: string;
    };

    const patch: Record<string, unknown> = {};
    if (cnpj !== undefined && !isValidCnpj(cnpj)) {
      return NextResponse.json({ error: "INVALID_CNPJ" }, { status: 400 });
    }
    if (name) patch.name = name.toUpperCase();
    if (legalName !== undefined) patch.legalName = legalName;
    if (cnpj !== undefined) patch.cnpj = cnpj;

    if (Object.keys(patch).length > 0) {
      await db.update(clients).set(patch).where(eq(clients.id, numId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/clients/:id — soft-delete (archive). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.update(clients).set({ archived: true }).where(eq(clients.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
