import { ApiHttpError } from "@/lib/api/types";

export type ImportRowError = {
  row: number;
  errors: Record<string, string[]>;
};

/**
 * Pull the per-row validation report out of an import failure. The academic-ops
 * import endpoints return HTTP 422 with `{ error, rows: [{ row, errors }] }`;
 * `ApiHttpError.payload` holds the raw body, so this returns the `rows` array
 * (or `[]` when the error isn't an import-validation failure).
 */
export function extractImportRows(err: unknown): ImportRowError[] {
  if (!(err instanceof ApiHttpError) || typeof err.payload !== "object" || err.payload === null) {
    return [];
  }
  const rows = (err.payload as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as ImportRowError[]) : [];
}
