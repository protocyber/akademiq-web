import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Combobox } from "@/components/ui/select";

interface Item {
  id: string;
  label: string;
}

const items: Item[] = [{ id: "one", label: "Option One" }];

function renderCombobox(
  props: Partial<{
    items: Item[];
    isLoading: boolean;
    value: string;
    onValueChange: (value: string) => void;
  }> = {},
) {
  return render(
    <Combobox
      items={props.items ?? items}
      isLoading={props.isLoading ?? false}
      value={props.value}
      onValueChange={props.onValueChange ?? (() => undefined)}
      getOptionValue={(item) => item.id}
      getOptionLabel={(item) => item.label}
      placeholder="Choose item"
      emptyText="No items"
      {...props}
    />,
  );
}

describe("Combobox", () => {
  it("shows a spinner and disables the trigger while loading", () => {
    renderCombobox({ isLoading: true, items: [] });

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
    // expect(screen.getByText("Memuat...")).toBeInTheDocument(); // default loadingText is set to ''
  });

  it("shows the empty state and disables the trigger when data is empty", () => {
    renderCombobox({ items: [] });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("enables the trigger when data is present", () => {
    renderCombobox();

    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(screen.getByText("Choose item")).toBeInTheDocument();
  });
});
