import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { contacts } from "@/db/schema/contacts";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/contacts — add a contact to a client unit OR supplier.
 * Body: { clientUnitId?, supplierId?, name?, role?, phone?, email? }
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as {
      clientUnitId?: number;
      supplierId?: number;
      name?: string;
      role?: string;
      phone?: string;
      email?: string;
    };

    if (!body.clientUnitId && !body.supplierId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const [created] = await db
      .insert(contacts)
      .values({
        clientUnitId: body.clientUnitId,
        supplierId: body.supplierId,
        name: body.name,
        role: body.role,
        phone: body.phone,
        email: body.email,
      })
      .returning({ id: contacts.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (contacts POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
