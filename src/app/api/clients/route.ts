import { NextResponse, type NextRequest } from "next/server";
import { and, ilike, inArray, not } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema/clients";
import { clientUnits } from "@/db/schema/client-units";
import { clientContacts } from "@/db/schema/client-contacts";
import { requireSession } from "@/lib/auth";

/**
 * GET /api/clients — paginated list of non-archived clients, with their units
 * + contacts populated. Optional `search` (case-insensitive on name).
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { search } = Object.fromEntries(req.nextUrl.searchParams);
    const conds = [not(clients.archived)];
    if (search) conds.push(ilike(clients.name, `%${search}%`));

    const clientRows = await db
      .select()
      .from(clients)
      .where(and(...conds))
      .orderBy(clients.name);

    if (clientRows.length === 0) return NextResponse.json([]);

    const ids = clientRows.map((c) => c.id);
    const units = await db
      .select()
      .from(clientUnits)
      .where(inArray(clientUnits.clientId, ids));
    const unitIds = units.map((u) => u.id);
    const contacts =
      unitIds.length > 0
        ? await db
            .select()
            .from(clientContacts)
            .where(inArray(clientContacts.clientUnitId, unitIds))
        : [];

    const unitsByClient = new Map<number, typeof units>();
    for (const u of units) {
      if (!unitsByClient.has(u.clientId)) unitsByClient.set(u.clientId, []);
      unitsByClient.get(u.clientId)!.push(u);
    }
    const contactsByUnit = new Map<number, typeof contacts>();
    for (const c of contacts) {
      if (!contactsByUnit.has(c.clientUnitId)) contactsByUnit.set(c.clientUnitId, []);
      contactsByUnit.get(c.clientUnitId)!.push(c);
    }

    const result = clientRows.map((c) => ({
      ...c,
      units: (unitsByClient.get(c.id) ?? []).map((u) => ({
        ...u,
        contacts: contactsByUnit.get(u.id) ?? [],
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.log("UNEXPECTED ERROR (clients GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * POST /api/clients — create a new client (with optional units).
 * Body: { name, legalName?, cnpj?, units?: [{ name, ...address }] }
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { name, legalName, cnpj, units: unitRows } = (await req.json()) as {
      name?: string;
      legalName?: string;
      cnpj?: string;
      units?: { name: string; street?: string; city?: string; state?: string }[];
    };

    if (!name) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [created] = await db
      .insert(clients)
      .values({ name: name.toUpperCase(), legalName, cnpj, archived: false })
      .returning({ id: clients.id });

    if (unitRows && unitRows.length > 0) {
      await db.insert(clientUnits).values(
        unitRows.map((u) => ({
          clientId: created.id,
          name: u.name.toUpperCase(),
          street: u.street,
          city: u.city,
          state: u.state,
        })),
      );
    }

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") {
      return NextResponse.json({ error: "CLIENT_ALREADY_EXISTS" }, { status: 422 });
    }
    console.log("UNEXPECTED ERROR (clients POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
