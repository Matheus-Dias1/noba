import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppliers } from "@/db/schema/suppliers";
import { productSuppliers } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/** GET /api/suppliers — all suppliers, with their linked product ids. */
export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        cnpj: suppliers.cnpj,
        phone: suppliers.phone,
        email: suppliers.email,
        createdAt: suppliers.createdAt,
        productId: productSuppliers.productId,
      })
      .from(suppliers)
      .leftJoin(productSuppliers, eq(productSuppliers.supplierId, suppliers.id))
      .orderBy(suppliers.name);

    // collapse joins into supplier → productIds[]
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        cnpj: string | null;
        phone: string | null;
        email: string | null;
        createdAt: Date;
        productIds: number[];
      }
    >();
    for (const r of rows) {
      if (!map.has(r.id)) {
        map.set(r.id, {
          id: r.id,
          name: r.name,
          cnpj: r.cnpj,
          phone: r.phone,
          email: r.email,
          createdAt: r.createdAt,
          productIds: [],
        });
      }
      if (r.productId) map.get(r.id)?.productIds.push(r.productId);
    }

    return NextResponse.json([...map.values()]);
  } catch (err) {
    console.log("UNEXPECTED ERROR (suppliers GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** POST /api/suppliers — create a new supplier. */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { name, cnpj, phone, email } = (await req.json()) as {
      name?: string;
      cnpj?: string;
      phone?: string;
      email?: string;
    };

    if (!name) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [created] = await db
      .insert(suppliers)
      .values({ name: name.toUpperCase(), cnpj, phone, email })
      .returning({ id: suppliers.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (suppliers POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
