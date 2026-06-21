import * as React from "react";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";

export type SelectWithinPageToggleMode = "all" | "some";

export type DeriveSelectWithinPageInput<T> = {
  rows: T[];
  rowSelection: RowSelectionState;
  getRowId: (row: T) => string;
};

export type DeriveSelectWithinPageResult = {
  allSelected: boolean;
  someSelected: boolean;
  noneSelected: boolean;
  checked: boolean | "indeterminate";
  disabled: boolean;
};

export type UseSelectWithinPageInput<T> = DeriveSelectWithinPageInput<T> & {
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  toggleMode?: SelectWithinPageToggleMode;
};

export type UseSelectWithinPageResult = DeriveSelectWithinPageResult & {
  toggleAll: () => void;
  selectAll: () => void;
  clearAll: () => void;
};

export function deriveSelectWithinPage<T>({
  rows,
  rowSelection,
  getRowId,
}: DeriveSelectWithinPageInput<T>): DeriveSelectWithinPageResult {
  const rowIds = rows.map(getRowId);
  const selectedOnPage = rowIds.filter((id) => rowSelection[id]);

  const allSelected = rows.length > 0 && selectedOnPage.length === rows.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;
  const noneSelected = selectedOnPage.length === 0;

  const checked: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;
  const disabled = rows.length === 0;

  return { allSelected, someSelected, noneSelected, checked, disabled };
}

export function useSelectWithinPage<T>({
  rows,
  rowSelection,
  getRowId,
  onRowSelectionChange,
  toggleMode = "all",
}: UseSelectWithinPageInput<T>): UseSelectWithinPageResult {
  const derived = React.useMemo(
    () => deriveSelectWithinPage({ rows, rowSelection, getRowId }),
    [rows, rowSelection, getRowId],
  );

  const selectAll = React.useCallback(() => {
    const next: RowSelectionState = { ...rowSelection };
    for (const row of rows) next[getRowId(row)] = true;
    onRowSelectionChange(next);
  }, [rows, rowSelection, getRowId, onRowSelectionChange]);

  const clearAll = React.useCallback(() => {
    if (rows.length === 0) {
      if (Object.keys(rowSelection).length > 0) onRowSelectionChange({});
      return;
    }
    const idsOnPage = new Set(rows.map(getRowId));
    const next: RowSelectionState = {};
    let changed = false;
    for (const [id, value] of Object.entries(rowSelection)) {
      if (idsOnPage.has(id)) {
        changed = true;
      } else {
        next[id] = value;
      }
    }
    if (changed) onRowSelectionChange(next);
  }, [rows, rowSelection, getRowId, onRowSelectionChange]);

  const toggleAll = React.useCallback(() => {
    if (toggleMode === "some") {
      if (derived.someSelected || derived.allSelected) {
        clearAll();
      } else {
        selectAll();
      }
      return;
    }
    if (derived.allSelected) {
      clearAll();
    } else {
      selectAll();
    }
  }, [toggleMode, derived.allSelected, derived.someSelected, clearAll, selectAll]);

  return { ...derived, toggleAll, selectAll, clearAll };
}
