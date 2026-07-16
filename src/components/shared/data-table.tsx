"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Shared, consistently-styled table used by the Products and Orders list pages.
 * Headers are uppercase, muted, and sit on a subtle muted band; body cells use
 * tabular numbers where appropriate. This keeps the look uniform across modules.
 */
export interface DataTableColumn<T> {
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "Nenhum resultado.",
  onRowClick,
  containerClassName,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  containerClassName?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", containerClassName)}>
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col.header}
                className={`h-10 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground ${col.className ?? ""}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={rowKey(row, i)}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col, ci) => (
                <TableCell key={ci} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
