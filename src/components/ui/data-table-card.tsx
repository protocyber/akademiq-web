"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';

export type DataTablePaginationProps = {
  className?: string;
  page: number;
  pageCount: number;
  total: number;
  label?: string;
  onPrev: () => void;
  onNext: () => void;
};

export function DataTablePagination({
  className,
  page,
  pageCount,
  total,
  label = "item",
  onPrev,
  onNext,
}: DataTablePaginationProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm text-muted-foreground px-4", className)}>
      <span>
        Halaman {page} dari {pageCount} · {total} {label}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={onNext}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

export type DataTableToolbarProps = {
  className?: string;
  selectAll?: {
    checked: boolean | "indeterminate";
    disabled: boolean;
    onToggle: () => void;
  };
  bulkActions?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
};

export function DataTableToolbar({
  className,
  selectAll,
  bulkActions,
  search,
  filters,
}: DataTableToolbarProps) {
  const hasLeft = Boolean(selectAll || bulkActions || search);
  const hasRight = Boolean(filters);
  if (!hasLeft && !hasRight) return null;
  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center px-4", className)}>
      {hasLeft ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-1">
          {selectAll ? (
            <Checkbox
              checked={selectAll.checked}
              disabled={selectAll.disabled}
              onCheckedChange={() => selectAll.onToggle()}
              aria-label="Pilih semua di halaman ini"
              className="size-4"
            />
          ) : null}
          {bulkActions}
          {search}
        </div>
      ) : null}
      {hasRight ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {filters}
        </div>
      ) : null}
    </div>
  );
}

export type DataTableCardProps = {
  title: string;
  description?: string;
  primaryActions?: React.ReactNode;
  toolbar?: DataTableToolbarProps;
  children: React.ReactNode;
  pagination?: DataTablePaginationProps;
};

export function DataTableCard({
  title,
  description,
  primaryActions,
  toolbar,
  children,
  pagination,
}: DataTableCardProps) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {primaryActions ? (
            <div className="flex flex-col md:flex-row gap-2">
              {primaryActions}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-4 px-0 space-y-3", pagination || "pb-0")}>
        {toolbar ? <DataTableToolbar {...toolbar} /> : null}
        {children}
        {pagination ? <DataTablePagination {...pagination} /> : null}
      </CardContent>
    </Card>
  );
}
