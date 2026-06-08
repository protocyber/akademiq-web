import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

describe("Button loading state", () => {
  it("shows spinner and disables when loading=true", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button", { name: /submit/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders normally when loading=false", () => {
    render(<Button>Submit</Button>);
    const button = screen.getByRole("button", { name: /submit/i });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });
});

describe("Skeleton", () => {
  it("exposes status role for assistive tech", () => {
    render(<Skeleton className="h-4 w-32" data-testid="sk" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByTestId("sk")).toHaveClass("animate-pulse");
  });
});
