import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Product } from "@/models/product";

/** GET /api/products/:id — single product. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id);
    return NextResponse.json(product);
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id GET):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * PUT /api/products/:id — partial update (only provided fields are $set).
 * Ported verbatim, including the `$set`/`null`-merge trick.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const { description, defaultMeasurementUnit, conversions } = (await req.json()) as {
      description?: string;
      defaultMeasurementUnit?: string;
      conversions?: unknown;
    };

    const update = {
      $set: Object.assign(
        {},
        description ? { description } : null,
        defaultMeasurementUnit ? { defaultMeasurementUnit } : null,
        conversions ? { conversions } : null,
      ),
    };
    if (Object.keys(update.$set).length > 0) {
      await Product.updateOne({ _id: new mongoose.Types.ObjectId(id) }, update);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id PUT):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/**
 * DELETE /api/products/:id — soft-delete (sets archived: true).
 * Ported verbatim. Not yet exposed in the UI (see PAGES_EXTRACTION.md §10 #3).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { archived: true } },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log("UNEXPECTED ERROR (products/:id DELETE):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
