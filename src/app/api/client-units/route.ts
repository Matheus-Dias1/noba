import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { clientUnits } from "@/db/schema/client-units";
import { requireSession } from "@/lib/auth";
import { isValidCnpj } from "@/lib/brazilian-documents";

/**
 * POST /api/client-units — create a unit under a client.
 * Body: { clientId, name, cnpj?, street?, number?, neighborhood?, city?, state?, zip?, complement? }
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as {
      clientId: number;
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

    if (!body.clientId || !body.name || !body.cnpj || !isValidCnpj(body.cnpj)) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const [created] = await db
      .insert(clientUnits)
      .values({
        clientId: body.clientId,
        name: body.name.toUpperCase(),
        cnpj: body.cnpj,
        street: body.street,
        number: body.number,
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state,
        zip: body.zip,
        complement: body.complement,
      })
      .returning({ id: clientUnits.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (client-units POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
