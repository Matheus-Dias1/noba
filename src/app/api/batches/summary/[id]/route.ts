import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Batch } from "@/models/batch";
import { normalize } from "@/lib/normalize";
import "@/models/order"; // register Order schema for populate
import "@/models/product"; // register Product schema for nested populate

/**
 * GET /api/batches/summary/:id — one batch fully populated (orders + items +
 * products). Used by the Batch details screen. Passed through `normalize()`
 * (see /summary route comment) so populated nested refs get a stable `id`.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const summary = await Batch.findById(id).populate({
      path: "orders",
      model: "Order",
      select: "-batch",
      populate: { path: "items", populate: { path: "item", model: "Product" } },
    });
    return NextResponse.json(normalize(summary));
  } catch (err) {
    console.log("UNEXPECTED ERROR (batches/summary/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
