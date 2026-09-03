import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/ui/password-input";

describe("PasswordInput", () => {
  it("renders with type password initially and toggles visibility on button click", () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: "Lihat password" });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("title", "Lihat password");

    fireEvent.click(toggleBtn);

    expect(input.type).toBe("text");
    const hideBtn = screen.getByRole("button", { name: "Sembunyikan password" });
    expect(hideBtn).toBeInTheDocument();
    expect(hideBtn).toHaveAttribute("title", "Sembunyikan password");

    fireEvent.click(hideBtn);

    expect(input.type).toBe("password");
    expect(screen.getByRole("button", { name: "Lihat password" })).toBeInTheDocument();
  });

  it("renders leftIcon when provided", () => {
    render(
      <PasswordInput
        placeholder="Password with icon"
        leftIcon={<span data-testid="test-lock-icon">Lock</span>}
      />,
    );

    expect(screen.getByTestId("test-lock-icon")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Password with icon");
    expect(input.className).toContain("pl-10");
  });

  it("forwards ref to the html input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} placeholder="Ref test" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe("Ref test");
  });

  it("disables both input and toggle button when disabled is true", () => {
    render(<PasswordInput placeholder="Disabled input" disabled />);

    const input = screen.getByPlaceholderText("Disabled input");
    const toggleBtn = screen.getByRole("button", { name: "Lihat password" });

    expect(input).toBeDisabled();
    expect(toggleBtn).toBeDisabled();
  });

  it("merges custom className onto input element", () => {
    render(<PasswordInput placeholder="Custom class" className="custom-input-class" />);

    const input = screen.getByPlaceholderText("Custom class");
    expect(input.className).toContain("custom-input-class");
  });
});
