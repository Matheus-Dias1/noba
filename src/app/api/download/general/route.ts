import { NextResponse, type NextRequest } from "next/server";
import { Workbook } from "exceljs";
import { requireSession } from "@/lib/auth";

interface GeneralRow {
  id?: string;
  item: string;
  amount: number;
  unit: string;
}

/**
 * POST /api/download/general — generate an .xlsx with per-product totals.
 * Ported verbatim from the original `resolvers/download.ts` (/download/general).
 * Columns: Item | Unidade | Quantidade | Estoque (0) | Faltante (formula).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { data, batch } = (await req.json()) as { data: GeneralRow[]; batch: string };

    const wb = new Workbook();
    wb.properties.date1904 = true;
    wb.calcProperties.fullCalcOnLoad = true;

    const sheet = wb.addWorksheet(batch);
    const columns = [
      { name: "Item", width: 40, font: { color: { rgb: "FFF" } } },
      { name: "Unidade", width: 15 },
      { name: "Quantidade", width: 20 },
      { name: "Estoque", width: 20 },
      { name: "Faltante", width: 20 },
    ];

    const rows = data.map((x, i) => [
      x.item,
      x.unit,
      x.amount,
      0,
      { formula: `C${i + 2}-D${i + 2}` },
    ]);
    rows.push([]);

    sheet.addTable({
      name: batch,
      ref: "A1",
      style: { theme: "TableStyleLight8", showRowStripes: true },
      columns,
      rows,
    });

    sheet.getRow(1).font = { color: { argb: "#ffffff" }, size: 12, bold: true };
    [40, 15, 20, 20, 20].forEach((w, i) => (sheet.getColumn(i + 1).width = w));

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=records.xlsx",
      },
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (download/general):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
