import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * Regression guard for the nested-modal freeze.
 *
 * When `@radix-ui/react-dialog` exists as two copies in the tree (e.g. the
 * Dialog primitive on one version and AlertDialog/cmdk on another), each copy
 * runs its own focus-scope + aria-hidden + scroll-lock singletons. Opening an
 * AlertDialog on top of a Dialog then deadlocks: the outer Dialog marks the
 * focused inner content `aria-hidden="true"`, the browser blocks it, and the
 * focus trap freezes the whole page. A single copy lets Radix coordinate the
 * stack correctly, so the inner content must stay focusable and never be
 * `aria-hidden`.
 */
function Harness() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  return (
    <Dialog defaultOpen>
      <DialogContent data-testid="outer-dialog">
        <DialogTitle>Outer</DialogTitle>
        <DialogDescription>outer body</DialogDescription>
        <button
          type="button"
          data-testid="open-confirm"
          onClick={() => setConfirmOpen(true)}
        >
          Reset password
        </button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Reset password?"
          description="Are you sure?"
          confirmLabel="Reset"
          cancelLabel="Batal"
          onConfirm={() => setConfirmOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

describe("ConfirmDialog nested inside Dialog", () => {
  it("opens the inner AlertDialog on top of the outer Dialog without hiding it from assistive tech", async () => {
    render(<Harness />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-confirm"));
    });

    const innerTitle = await screen.findByText("Reset password?");
    const innerDialog = innerTitle.closest("[role='alertdialog']") ?? innerTitle;

    expect(innerDialog).toBeVisible();
    expect(innerDialog).not.toHaveAttribute("aria-hidden", "true");

    const confirmBtn = screen.getByRole("button", { name: "Reset" });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText("Reset password?")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("outer-dialog")).toBeVisible();
  });
});
