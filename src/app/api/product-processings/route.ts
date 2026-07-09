import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { productProcessings } from "@/db/schema/products";
import { requireSession } from "@/lib/auth";

/** POST /api/product-processings — create a processing option for a product. */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { productId, name } = (await req.json()) as { productId: number; name: string };
    if (!productId || !name) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const [created] = await db
      .insert(productProcessings)
      .values({ productId, name: name.toUpperCase() })
      .returning({ id: productProcessings.id });

    return NextResponse.json({ id: String(created.id) }, { status: 201 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (product-processings POST):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
