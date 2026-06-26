export const BULK_PRINT_STORAGE_KEY = "bulkPrint:reportCardIds";

export function readBulkPrintIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BULK_PRINT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeBulkPrintIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BULK_PRINT_STORAGE_KEY, JSON.stringify(ids));
}

export function clearBulkPrintIds(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BULK_PRINT_STORAGE_KEY);
}
