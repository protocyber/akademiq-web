import { format, setDefaultOptions } from "date-fns";
import { id } from "date-fns/locale/id";
import { TZDate } from "@date-fns/tz";

// Set Indonesian locale globally for all date-fns operations
setDefaultOptions({ locale: id });

/**
 * Format a DATE column (e.g., "2026-08-04") to Indonesian display format.
 * Output: "4 Agustus 2026"
 *
 * @param value - ISO date string (DATE column from database)
 * @returns Formatted Indonesian date string
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return format(date, "d MMMM yyyy");
  } catch {
    return "";
  }
}

/**
 * Format a TIMESTAMPTZ column (e.g., "2026-08-04T14:30:00Z") to Indonesian display format
 * with explicit Asia/Jakarta timezone conversion.
 * Output: "4 Agustus 2026, 14:30"
 *
 * @param value - ISO datetime string (TIMESTAMPTZ column from database)
 * @returns Formatted Indonesian datetime string in WIB timezone
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const date = new TZDate(value, "Asia/Jakarta");
    if (isNaN(date.getTime())) return "";
    return format(date, "d MMMM yyyy, HH:mm");
  } catch {
    return "";
  }
}
