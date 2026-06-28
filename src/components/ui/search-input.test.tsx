import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "@/components/ui/search-input";

describe("SearchInput", () => {
  it("does not fire onChange with stale search term when value prop is updated externally", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchInput value="budi" onChange={onChange} debounce={100} />,
    );

    // Simulate navigation back to page with clean URL: value prop becomes ""
    rerender(<SearchInput value="" onChange={onChange} debounce={100} />);

    // Should NOT fire onChange with "budi" — the isFirstRender guard prevents
    // the sync effect from calling onChange during rerender, and the debounce
    // timer fired with the synced empty value, not the stale one.
    const calls = onChange.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("budi");
  });

  it("fires onChange via internal debounce when user types", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} debounce={100} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "b" } });

    // Wait for debounce to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(onChange).toHaveBeenCalledWith("b");
  });
});
