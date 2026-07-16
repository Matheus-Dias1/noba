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
import { Skeleton } from "@/components/ui/skeleton";

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
  tableClassName,
  loading = false,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  containerClassName?: string;
  tableClassName?: string;
  loading?: boolean;
}) {
  if (!loading && rows.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", containerClassName)}>
      <Table className={tableClassName} containerClassName="overflow-visible">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col.header}
                className={`sticky top-0 z-10 h-10 bg-muted whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground ${col.className ?? ""}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? Array.from({ length: 10 }, (_, rowIndex) => (
            <TableRow key={`skeleton-${rowIndex}`}>
              {columns.map((col, columnIndex) => (
                <TableCell key={columnIndex} className={col.className}>
                  <Skeleton className="h-5 w-full min-w-16" />
                </TableCell>
              ))}
            </TableRow>
          )) : rows.map((row, i) => (
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
