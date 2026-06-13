export type TenantUsersSort = "name" | "-name" | "status" | "-status" | "role" | "-role";

export type TenantUsersParams = {
  search?: string;
  role?: string;
  status?: string;
  page: number;
  page_size: number;
  sort: TenantUsersSort;
};

export const DEFAULT_TENANT_USERS_PARAMS: TenantUsersParams = {
  page: 1,
  page_size: 25,
  sort: "name",
};

const sortValues = new Set<TenantUsersSort>(["name", "-name", "status", "-status", "role", "-role"]);

export function parseTenantUsersParams(searchParams: URLSearchParams): TenantUsersParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_TENANT_USERS_PARAMS.page);
  const pageSize = numberParam(searchParams.get("page_size"), DEFAULT_TENANT_USERS_PARAMS.page_size);
  const sort = searchParams.get("sort");

  return {
    search: textParam(searchParams.get("search")),
    role: textParam(searchParams.get("role")),
    status: textParam(searchParams.get("status")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort: sort && sortValues.has(sort as TenantUsersSort) ? (sort as TenantUsersSort) : DEFAULT_TENANT_USERS_PARAMS.sort,
  };
}

export function serializeTenantUsersParams(params: TenantUsersParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.role) searchParams.set("role", params.role);
  if (params.status) searchParams.set("status", params.status);
  if (params.page !== DEFAULT_TENANT_USERS_PARAMS.page) searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_TENANT_USERS_PARAMS.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_TENANT_USERS_PARAMS.sort) searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function tenantUsersParamsKey(params: TenantUsersParams) {
  return [params.search ?? "", params.role ?? "", params.status ?? "", params.page, params.page_size, params.sort] as const;
}

function numberParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function textParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
