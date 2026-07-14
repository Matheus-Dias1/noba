"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "./data-table";

/**
 * Grouped, collapsible sibling to DataTable. Same visual language (uppercase
 * muted header, rounded border, subtle muted band) but rows are organized
 * into collapsible sections instead of a flat list. Use this when rows need
 * a group header (e.g. Orders by status, Products by category); use
 * DataTable for everything else.
 */
export interface DataTableGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

export function GroupedDataTable<T>({
  columns,
  groups,
  rowKey,
  emptyText = "Nenhum resultado.",
  onRowClick,
  defaultCollapsedGroups = [],
}: {
  columns: DataTableColumn<T>[];
  groups: DataTableGroup<T>[];
  rowKey: (row: T, index: number) => string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  defaultCollapsedGroups?: string[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultCollapsedGroups.map((key) => [key, true])),
  );

  function toggleGroup(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const hasRows = groups.some((group) => group.rows.length > 0);
  if (!hasRows) {
    return (
      <p className="px-1 py-6 text-sm text-muted-foreground">{emptyText}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
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
          {groups.map((group) => {
            if (group.rows.length === 0) return null;
            const isOpen = !collapsed[group.key];
            return (
              <Fragment key={group.key}>
                <TableRow
                  className="cursor-pointer bg-muted/50 hover:bg-muted"
                  onClick={() => toggleGroup(group.key)}
                >
                  <TableCell
                    className="py-2 text-sm font-semibold"
                    colSpan={columns.length}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-90",
                        )}
                      />
                      {group.label}
                      <span className="font-normal text-muted-foreground">
                        {group.rows.length}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
                {isOpen &&
                  group.rows.map((row, i) => (
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
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
