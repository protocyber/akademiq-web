import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/select";

const options = [
  { value: "one", label: "Option One" },
  { value: "two", label: "Option Two" },
];

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

function renderInDialog(children: React.ReactNode) {
  return render(
    <Dialog open>
      <DialogContent data-testid="dialog-content">
        <DialogTitle>Test dialog</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>,
  );
}

function renderOutsideDialog(children: React.ReactNode) {
  return render(<div data-testid="outside-content">{children}</div>);
}

async function openAndExpectSearch({
  placeholder,
  rootTestId,
}: {
  placeholder: string;
  rootTestId: string;
}) {
  const rootContent = screen.getByTestId(rootTestId);
  const trigger = screen.getByRole("combobox");

  await act(async () => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);
  });
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

  const input = await screen.findByPlaceholderText(placeholder);
  await waitFor(() => expect(input).toHaveFocus());

  fireEvent.change(input, { target: { value: "Option Two" } });
  expect(input).toHaveValue("Option Two");

  expect(rootContent).not.toContainElement(input);

  fireEvent.keyDown(input, {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
  });
  await waitFor(() => expect(input).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
}

describe("combobox controls inside Dialog", () => {
  it("keeps multi Combobox dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <Combobox
        multiple
        searchable
        items={options}
        value={[]}
        onValueChange={vi.fn()}
        placeholder="Choose options"
        searchPlaceholder="Search options"
        popoverModal
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search options",
      rootTestId: "dialog-content",
    });
  });

  it("keeps searchable Combobox dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <Combobox
        searchable
        items={options}
        isLoading={false}
        onValueChange={vi.fn()}
        placeholder="Choose item"
        searchPlaceholder="Search items"
        emptyText="No items"
        aria-label="Choose item"
        popoverModal
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search items",
      rootTestId: "dialog-content",
    });
  });

  it("keeps server-search multi Combobox dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <Combobox
        multiple
        searchable
        items={options}
        value={[]}
        onValueChange={vi.fn()}
        onSearchChange={vi.fn()}
        placeholder="Choose many"
        searchPlaceholder="Search many"
        popoverModal
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search many",
      rootTestId: "dialog-content",
    });
  });

  it("keeps default popovers searchable outside dialogs", async () => {
    renderOutsideDialog(
      <Combobox
        multiple
        searchable
        items={options}
        value={[]}
        onValueChange={vi.fn()}
        placeholder="Choose options"
        searchPlaceholder="Search options"
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search options",
      rootTestId: "outside-content",
    });
  });
});
