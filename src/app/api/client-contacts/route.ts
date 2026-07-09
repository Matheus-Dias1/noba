import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { clientContacts } from "@/db/schema/client-contacts";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/client-contacts — add a contact to a unit.
 * Body: { clientUnitId, name?, role?, phone?, email? }
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as {
      clientUnitId: number;
      name?: string;
      role?: string;
      phone?: string;
      email?: string;
    };

    if (!body.clientUnitId) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const [created] = await db
      .insert(clientContacts)
      .values({
        clientUnitId: body.clientUnitId,
        name: body.name,
        role: body.role,
        phone: body.phone,
        email: body.email,
      })
      .returning({ id: clientContacts.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-contacts POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
