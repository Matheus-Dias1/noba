import { NextResponse, type NextRequest } from "next/server";
import { Workbook } from "exceljs";
import { requireSession } from "@/lib/auth";

interface OrderSheetItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
}
interface OrderSheetClient {
  client: string;
  deliverAt: string;
  items: OrderSheetItem[];
}

/**
 * POST /api/download/orders — generate an .xlsx with one styled section per
 * client (Item | Quantidade | Unidade). Ported verbatim from the original
 * `resolvers/download.ts` (/download/orders).
 */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const { data, batch } = (await req.json()) as { data: OrderSheetClient[]; batch: string };

    const wb = new Workbook();
    wb.properties.date1904 = true;
    wb.calcProperties.fullCalcOnLoad = true;

    const sheet = wb.addWorksheet(batch);
    const columns = [
      { name: "Item", width: 40, font: { color: { rgb: "FFF" } } },
      { name: "Quantidade", width: 20 },
      { name: "Unidade", width: 15 },
    ];

    data.forEach((client) => {
      const date = client.deliverAt
        ? new Date(client.deliverAt).toLocaleDateString("pt-BR")
        : "";
      const nameRow = sheet.addRow([`${client.client} - ${date}`]);
      nameRow.font = { size: 14, bold: true };
      const currRow = sheet.rowCount;

      const rows = client.items.map((x) => [x.name, x.amount, x.unit]);
      rows.push([]);

      sheet.addTable({
        name: client.client,
        ref: `A${currRow + 1}`,
        columns,
        rows,
      });

      const headerRow = sheet.rowCount - rows.length;
      const header = sheet.getRow(headerRow);
      header.font = { size: 12, bold: true, color: { argb: "ffffff" } };

      for (let i = headerRow; i <= headerRow - 1 + rows.length; i += 1) {
        [`A${i}`, `B${i}`, `C${i}`].forEach((cell) => {
          const sCell = sheet.getCell(cell);
          if (i === headerRow) {
            sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3d85c6" } };
          } else {
            sCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: i % 2 ? "dbe5f1" : "b8cce4" },
            };
          }
        });
      }
    });

    [40, 20, 15].forEach((w, i) => (sheet.getColumn(i + 1).width = w));

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=records.xlsx",
      },
    });
  } catch (err) {
    console.log("UNEXPECTED ERROR (download/orders):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
