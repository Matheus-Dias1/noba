import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Order } from "@/models/order";

/** GET /api/orders/:id — single order, fully populated. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id)
      .populate({ path: "items", populate: { path: "item", model: "Product" } })
      .populate({ path: "batch", model: "Batch" });
    return NextResponse.json(order);
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * PUT /api/orders/:id — partial update (only provided fields are $set).
 * Ported verbatim. Note: changing `batch` does NOT move the order between
 * batches' `orders[]` arrays (carried-over bug, §10 #4).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const { client, batch, deliverAt, items } = (await req.json()) as {
      client?: string;
      batch?: string;
      deliverAt?: string;
      items?: { item: string; amount: number; measurementUnit: string }[];
    };

    const update = {
      $set: Object.assign(
        {},
        client ? { client } : null,
        batch ? { batch } : null,
        deliverAt ? { deliverAt } : null,
        items ? { items } : null,
      ),
    };
    if (Object.keys(update.$set).length > 0) {
      await Order.updateOne({ _id: new mongoose.Types.ObjectId(id) }, update);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/orders/:id — soft-delete (sets archived: true). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    await Order.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { archived: true } },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (orders/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
