/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AuthGuard } from "@/components/features/auth-guard";
import { useAuth } from "@/hooks/use-auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

describe("AuthGuard password gate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects scoped no-password sessions to set-password", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasScopedToken: true,
      needsPassword: true,
      user: { password_set: false },
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <AuthGuard fallback={<div>Loading</div>}>
        <div>Dashboard</div>
      </AuthGuard>,
    );

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/set-password"));
  });

  it("renders protected content when password is set", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasScopedToken: true,
      needsPassword: false,
      user: { password_set: true },
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
