import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { QueryCombobox } from "@/components/ui/query-combobox";
import { QueryMultiSelect } from "@/components/ui/query-multi-select";

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
    <Dialog open modal={false}>
      <DialogContent data-testid="dialog-content">
        <DialogTitle>Test dialog</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>,
  );
}

async function openAndExpectSearch({
  placeholder,
}: {
  placeholder: string;
}) {
  const dialogContent = screen.getByTestId("dialog-content");
  const trigger = screen.getByRole("combobox");

  await act(async () => {
    trigger.click();
  });
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

  const input = await screen.findByPlaceholderText(placeholder);
  await waitFor(() => expect(input).toHaveFocus());

  fireEvent.change(input, { target: { value: "Option Two" } });
  expect(input).toHaveValue("Option Two");

  expect(dialogContent).not.toContainElement(input);

  fireEvent.keyDown(document.body, {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
  });
  fireEvent.click(trigger);
  await waitFor(() => expect(input).not.toBeInTheDocument());
  expect(trigger).toHaveAttribute("aria-expanded", "false");
}

describe("combobox controls inside Dialog", () => {
  it("keeps MultiSelect dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <MultiSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        placeholder="Choose options"
        searchPlaceholder="Search options"
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search options",
    });
  });

  it("keeps QueryCombobox dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <QueryCombobox
        items={options}
        isLoading={false}
        onValueChange={vi.fn()}
        getValue={(item) => item.value}
        getLabel={(item) => item.label}
        placeholder="Choose item"
        searchPlaceholder="Search items"
        emptyText="No items"
        aria-label="Choose item"
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search items",
    });
  });

  it("keeps QueryMultiSelect dropdown portaled and the search input focusable", async () => {
    renderInDialog(
      <QueryMultiSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        onSearchChange={vi.fn()}
        placeholder="Choose many"
        searchPlaceholder="Search many"
      />,
    );

    await openAndExpectSearch({
      placeholder: "Search many",
    });
  });
});
