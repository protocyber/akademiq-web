import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { RowSelectionState } from "@tanstack/react-table";

import {
  deriveSelectWithinPage,
  useSelectWithinPage,
} from "./use-select-within-page";

type Row = { id: string };

function rows(...ids: string[]): Row[] {
  return ids.map((id) => ({ id }));
}

const getRowId = (row: Row) => row.id;

describe("deriveSelectWithinPage", () => {
  it("marks none selected when selection is empty", () => {
    const out = deriveSelectWithinPage({
      rows: rows("a", "b", "c"),
      rowSelection: {},
      getRowId,
    });
    expect(out).toMatchObject({
      allSelected: false,
      someSelected: false,
      noneSelected: true,
      checked: false,
      disabled: false,
    });
  });

  it("marks all selected when every page row is selected", () => {
    const out = deriveSelectWithinPage({
      rows: rows("a", "b"),
      rowSelection: { a: true, b: true, z: true },
      getRowId,
    });
    expect(out.allSelected).toBe(true);
    expect(out.someSelected).toBe(false);
    expect(out.noneSelected).toBe(false);
    expect(out.checked).toBe(true);
  });

  it("marks indeterminate when a subset of page rows is selected", () => {
    const out = deriveSelectWithinPage({
      rows: rows("a", "b", "c"),
      rowSelection: { a: true },
      getRowId,
    });
    expect(out.allSelected).toBe(false);
    expect(out.someSelected).toBe(true);
    expect(out.noneSelected).toBe(false);
    expect(out.checked).toBe("indeterminate");
  });

  it("ignores selection entries that are not on the current page", () => {
    const out = deriveSelectWithinPage({
      rows: rows("a", "b"),
      rowSelection: { z: true, y: true },
      getRowId,
    });
    expect(out).toMatchObject({
      allSelected: false,
      someSelected: false,
      noneSelected: true,
      checked: false,
    });
  });

  it("is disabled and not all-selected when the page is empty", () => {
    const out = deriveSelectWithinPage({
      rows: [],
      rowSelection: {},
      getRowId,
    });
    expect(out.disabled).toBe(true);
    expect(out.allSelected).toBe(false);
    expect(out.someSelected).toBe(false);
    expect(out.noneSelected).toBe(true);
    expect(out.checked).toBe(false);
  });

  it("stays disabled even if stale selection exists across an empty page", () => {
    const out = deriveSelectWithinPage({
      rows: [],
      rowSelection: { stale: true },
      getRowId,
    });
    expect(out.disabled).toBe(true);
    expect(out.allSelected).toBe(false);
  });
});

function renderSelect<T extends Row>(
  initialRows: T[],
  initialSelection: RowSelectionState,
  options: {
    toggleMode?: "all" | "some";
  } = {},
) {
  const onChangeSpy = vi.fn<(next: RowSelectionState) => void>();

  const rack = renderHook(
    (props: { rows: T[]; rowSelection: RowSelectionState; toggleMode?: "all" | "some" }) => {
      return useSelectWithinPage({
        rows: props.rows,
        rowSelection: props.rowSelection,
        getRowId: (row: T) => row.id,
        onRowSelectionChange: onChangeSpy as unknown as (next: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void,
        toggleMode: props.toggleMode,
      });
    },
    {
      initialProps: {
        rows: initialRows,
        rowSelection: initialSelection,
        toggleMode: options.toggleMode,
      },
    },
  );

  function lastEmitted(): RowSelectionState {
    const calls = onChangeSpy.mock.calls;
    return calls.length ? (calls[calls.length - 1][0] as RowSelectionState) : initialSelection;
  }

  return {
    get result() {
      return rack.result;
    },
    rerender(nextRows: T[], nextSelection: RowSelectionState) {
      return rack.rerender({ rows: nextRows, rowSelection: nextSelection, toggleMode: options.toggleMode });
    },
    onChangeSpy,
    emitted: lastEmitted,
    unmount: rack.unmount,
  };
}

describe("useSelectWithinPage", () => {
  it("exposes derived state for an initial render", () => {
    const { result } = renderSelect(rows("a", "b"), { a: true });
    expect(result.current.checked).toBe("indeterminate");
    expect(result.current.someSelected).toBe(true);
  });

  it("selectAll selects every page row without dropping off-page entries", () => {
    const { result, emitted } = renderSelect(rows("a", "b"), { z: true });
    act(() => result.current.selectAll());
    expect(emitted()).toEqual({ a: true, b: true, z: true });
  });

  it("clearAll removes only on-page selection entries, preserving off-page ones", () => {
    const { result, emitted } = renderSelect(rows("a", "b"), {
      a: true,
      b: true,
      z: true,
    });
    act(() => result.current.clearAll());
    expect(emitted()).toEqual({ z: true });
  });

  it("clearAll on an empty page still drops stale selection", () => {
    const { result, emitted } = renderSelect([], { stale: true });
    act(() => result.current.clearAll());
    expect(emitted()).toEqual({});
  });

  it("does not call the setter when clearing an already-empty selection", () => {
    const { result, onChangeSpy } = renderSelect(rows("a"), {});
    act(() => result.current.clearAll());
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("toggleAll in 'all' mode toggles between all and none", () => {
    const { result, emitted, rerender } = renderSelect(rows("a", "b"), {}, {
      toggleMode: "all",
    });

    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({ a: true, b: true });

    rerender(rows("a", "b"), emitted());
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({});
  });

  it("toggleAll in 'all' mode completes a partial selection to all", () => {
    const { result, emitted } = renderSelect(rows("a", "b", "c"), { a: true }, {
      toggleMode: "all",
    });
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({ a: true, b: true, c: true });
  });

  it("toggleAll in 'some' mode clears from a partial (indeterminate) state", () => {
    const { result, emitted } = renderSelect(rows("a", "b", "c"), { a: true }, {
      toggleMode: "some",
    });
    expect(result.current.checked).toBe("indeterminate");
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({});
  });

  it("toggleAll in 'some' mode selects all from an empty state", () => {
    const { result, emitted } = renderSelect(rows("a", "b"), {}, {
      toggleMode: "some",
    });
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({ a: true, b: true });
  });

  it("toggleAll in 'some' mode clears from a fully selected state", () => {
    const { result, emitted } = renderSelect(
      rows("a", "b"),
      { a: true, b: true, z: true },
      { toggleMode: "some" },
    );
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({ z: true });
  });

  it("defaults to 'all' toggle mode when toggleMode is omitted", () => {
    const { result, emitted } = renderSelect(rows("a"), {});
    act(() => result.current.toggleAll());
    expect(emitted()).toEqual({ a: true });
  });

  it("updates derived state when the page rows change", () => {
    const { result, rerender } = renderSelect(rows("a", "b"), { a: true });
    expect(result.current.checked).toBe("indeterminate");

    rerender(rows("a", "b"), { a: true, b: true });
    expect(result.current.checked).toBe(true);
    expect(result.current.allSelected).toBe(true);
  });

  it("recomputes derived state when rowSelection identity changes", () => {
    const fixedRows = rows("a");
    const { result, rerender } = renderSelect(fixedRows, {});
    expect(result.current.checked).toBe(false);

    rerender(fixedRows, { a: true });
    expect(result.current.checked).toBe(true);
    expect(result.current.allSelected).toBe(true);
  });
});
