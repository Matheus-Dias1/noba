import { NextResponse, type NextRequest } from "next/server";
import { and, ilike, inArray, not, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema/clients";
import { clientUnits } from "@/db/schema/client-units";
import { contacts } from "@/db/schema/contacts";
import { requireSession } from "@/lib/auth";
import { isValidCnpj } from "@/lib/brazilian-documents";

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
    const contactRows =
      unitIds.length > 0
        ? await db
            .select()
            .from(contacts)
            .where(inArray(contacts.clientUnitId, unitIds))
        : [];

    const unitsByClient = new Map<number, typeof units>();
    for (const u of units) {
      if (!unitsByClient.has(u.clientId)) unitsByClient.set(u.clientId, []);
      unitsByClient.get(u.clientId)!.push(u);
    }
    const contactsByUnit = new Map<number, typeof contactRows>();
    for (const c of contactRows) {
      if (c.clientUnitId === null) continue; // supplier-only contact, skip
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
 * POST /api/clients — atomically create a client and its required units.
 * Body: { name, legalName?, cnpj?, units: [{ name, cnpj?, ...address }] }
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { name, legalName, cnpj, units: unitRows } = (await req.json()) as {
      name?: string;
      legalName?: string;
      cnpj?: string;
      units?: {
        name?: string;
        cnpj?: string;
        street?: string;
        number?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zip?: string;
        complement?: string;
      }[];
    };

    if (
      !name?.trim() ||
      !cnpj ||
      !isValidCnpj(cnpj) ||
      !unitRows?.length ||
      unitRows.some((unit) => !unit.name?.trim() || !unit.cnpj || !isValidCnpj(unit.cnpj))
    ) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    // Allocate the serial id first so both inserts can be sent in Neon's atomic
    // HTTP batch. A failed batch may leave a harmless sequence gap, never a
    // client without its units.
    const idResult = await db.execute<{ id: number }>(
      sql`select nextval(pg_get_serial_sequence('clients', 'id'))::int as id`,
    );
    const id = idResult.rows[0].id;

    await db.batch([
      db.insert(clients).values({
        id,
        name: name.trim().toUpperCase(),
        legalName,
        cnpj,
        archived: false,
      }),
      db.insert(clientUnits).values(
        unitRows.map((u) => ({
          clientId: id,
          name: u.name!.trim().toUpperCase(),
          cnpj: u.cnpj?.trim() || null,
          street: u.street?.trim() || null,
          number: u.number?.trim() || null,
          neighborhood: u.neighborhood?.trim() || null,
          city: u.city?.trim() || null,
          state: u.state?.trim() || null,
          zip: u.zip?.trim() || null,
          complement: u.complement?.trim() || null,
        })),
      ),
    ]);

    return NextResponse.json({ id: String(id) }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") {
      return NextResponse.json({ error: "CLIENT_ALREADY_EXISTS" }, { status: 422 });
    }
    console.log("UNEXPECTED ERROR (clients POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
