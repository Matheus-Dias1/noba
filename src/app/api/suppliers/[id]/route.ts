import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppliers } from "@/db/schema/suppliers";
import { productSuppliers } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/** PUT /api/suppliers/:id — update supplier fields, optionally replace product links. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { name, cnpj, phone, email, productIds } = (await req.json()) as {
      name?: string;
      cnpj?: string;
      phone?: string;
      email?: string;
      productIds?: number[];
    };

    const patch: Record<string, unknown> = {};
    if (name) patch.name = name.toUpperCase();
    if (cnpj !== undefined) patch.cnpj = cnpj;
    if (phone !== undefined) patch.phone = phone;
    if (email !== undefined) patch.email = email;
    if (Object.keys(patch).length > 0) {
      await db.update(suppliers).set(patch).where(eq(suppliers.id, numId));
    }

    // replace product links if provided
    if (productIds) {
      await db.delete(productSuppliers).where(eq(productSuppliers.supplierId, numId));
      if (productIds.length > 0) {
        await db.insert(productSuppliers).values(
          productIds.map((pid) => ({ supplierId: numId, productId: pid })),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (suppliers/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/suppliers/:id — hard delete (cascades via FK). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await db.delete(suppliers).where(eq(suppliers.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (suppliers/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
