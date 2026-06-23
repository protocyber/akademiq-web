/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { PermissionGuard } from "@/components/features/permission-guard";
import { useTenantPermissions } from "@/lib/query/queries/use-tenant-roles";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/query/queries/use-tenant-roles", () => ({
  useTenantPermissions: vi.fn(),
}));

describe("PermissionGuard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when the required permission is not held", async () => {
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [{ code: "academic.ops.manage", held: false }],
      isLoading: false,
    } as unknown as never);

    render(
      <PermissionGuard permission="academic.ops.manage">
        <div>Admin content</div>
      </PermissionGuard>,
    );

    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("renders children when the required permission is held", () => {
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [{ code: "academic.ops.manage", held: true }],
      isLoading: false,
    } as unknown as never);

    render(
      <PermissionGuard permission="academic.ops.manage">
        <div>Admin content</div>
      </PermissionGuard>,
    );

    expect(screen.getByText("Admin content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
