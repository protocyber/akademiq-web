"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
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

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

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
  /** Expandable rows: controlled expansion state keyed by row id. */
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  /** Predicate marking which rows can expand (defaults to none). */
  getRowCanExpand?: (row: Row<TData>) => boolean;
  /** Content rendered below an expanded row. When omitted, no expansion UI runs. */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
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
  expanded,
  onExpandedChange,
  getRowCanExpand,
  renderSubComponent,
  emptyText = "Tidak ada data.",
  classNames,
  classOverrides,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: renderSubComponent ? getExpandedRowModel() : undefined,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    getRowId,
    getRowCanExpand,
    state: {
      sorting: sorting ?? [],
      rowSelection: rowSelection ?? {},
      ...(renderSubComponent ? { expanded: expanded ?? {} } : {}),
    },
    onSortingChange,
    onRowSelectionChange,
    ...(renderSubComponent ? { onExpandedChange } : {}),
  });

  return (
    <div className={cn(classOverrides?.wrapper ?? "overflow-hidden rounded-md border", classNames?.wrapper)}>
      <Table className={cn(classOverrides?.table ?? "bg-card", classNames?.table)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className={cn(classOverrides?.headerRow, classNames?.headerRow)}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={cn(classOverrides?.headerCell, classNames?.headerCell, header.column.columnDef.meta?.headerClassName)} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
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
            table.getRowModel().rows.map((row, i) => {
              const isSelected = row.getIsSelected();
              return (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={isSelected && "selected"}
                    className={cn(
                      classOverrides?.row,
                      classNames?.row,
                      (i % 2 == 0 && !isSelected) ? "bg-muted/60 dark:bg-background/35" : ""
                    )}
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
                  {renderSubComponent && row.getIsExpanded() ? (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length} className="bg-background p-0">
                        {renderSubComponent(row)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })
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
