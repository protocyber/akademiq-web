import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuerySelect } from "@/components/ui/query-select";

interface Item {
  id: string;
  label: string;
}

const items: Item[] = [{ id: "one", label: "Option One" }];

function renderQuerySelect(props: Partial<React.ComponentProps<typeof QuerySelect<Item>>> = {}) {
  return render(
    <QuerySelect
      items={props.items ?? items}
      isLoading={props.isLoading ?? false}
      value={props.value}
      onValueChange={props.onValueChange ?? (() => undefined)}
      getValue={(item) => item.id}
      getLabel={(item) => item.label}
      placeholder="Choose item"
      emptyText="No items"
      {...props}
    />,
  );
}

describe("QuerySelect", () => {
  it("shows a spinner and disables the trigger while loading", () => {
    renderQuerySelect({ isLoading: true, items: [] });

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows the empty state and disables the trigger when data is empty", () => {
    renderQuerySelect({ items: [] });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("enables the trigger when data is present", () => {
    renderQuerySelect();

    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(screen.getByText("Choose item")).toBeInTheDocument();
  });
});
