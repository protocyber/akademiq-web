"use client";

import * as React from "react";
import {
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableClassNames = {
  wrapper?: string;
  table?: string;
  headerRow?: string;
  headerCell?: string;
  body?: string;
  row?: string;
  cell?: string;
  emptyCell?: string;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Stable row id accessor (defaults to index). */
  getRowId?: (row: TData, index: number) => string;
  /** Server-driven sorting state. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Selection state keyed by row id. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  emptyText?: string;
  /**
   * Additional classes appended after `classOverrides` (or the default) via `cn()`.
   * When used alone, merges with the element's default classes.
   * When used with `classOverrides`, appends on top of the override.
   */
  classNames?: DataTableClassNames;
  /**
   * Replaces the element's default classes entirely.
   * `classNames` is then appended on top of this value if also provided.
   */
  classOverrides?: DataTableClassNames;
};

/**
 * Thin TanStack Table wrapper running in `manualPagination` / `manualSorting`
 * mode: the server owns paging and sorting, so the table only renders the
 * provided page and surfaces sorting/selection state to the caller.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  emptyText = "Tidak ada data.",
  classNames,
  classOverrides,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    getRowId,
    state: {
      sorting: sorting ?? [],
      rowSelection: rowSelection ?? {},
    },
    onSortingChange,
    onRowSelectionChange,
  });

  return (
    <div className={cn(classOverrides?.wrapper ?? "overflow-hidden rounded-md border", classNames?.wrapper)}>
      <Table className={cn(classOverrides?.table ?? "bg-card", classNames?.table)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className={cn(classOverrides?.headerRow, classNames?.headerRow)}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={cn(classOverrides?.headerCell, classNames?.headerCell)} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(classOverrides?.body, classNames?.body)}>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(classOverrides?.row, classNames?.row, (i % 2 == 0) ? "bg-background/60" : "")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn(classOverrides?.cell, classNames?.cell)}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className={cn(classOverrides?.emptyCell ?? "h-24 text-center text-sm text-muted-foreground", classNames?.emptyCell)}
              >
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
