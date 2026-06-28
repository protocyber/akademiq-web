"use client";

import type { Path, UseFormReturn, FieldValues } from "react-hook-form";
import { toast } from "sonner";

import { ApiHttpError, FieldErrors } from "@/lib/api/types";

/**
 * Map a backend `VALIDATION_ERROR` payload to React Hook Form
 * `setError` calls. Field keys in the backend payload MUST match the
 * field paths in the Zod schema for the mapping to land on the right
 * input.
 *
 * Returns the list of fields that were set so callers can decide
 * whether anything was applied. If `error` is anything other than a
 * VALIDATION_ERROR with a `fields` map, this returns an empty array
 * and the form is not touched.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
): string[] {
  if (!(error instanceof ApiHttpError) || !error.fields) return [];
  const applied: string[] = [];
  for (const [field, messages] of Object.entries(error.fields)) {
    if (!messages?.length) continue;
    form.setError(field as Path<T>, {
      type: "server",
      message: messages[0],
    });
    applied.push(field);
  }
  if (applied.length > 0) {
    toast.error("Terdapat kesalahan validasi dari server. Silakan periksa kembali form.");
  }
  return applied;
}

/**
 * Convert a `FieldErrors` map into a single human-readable line for
 * use in toasts. Useful when the backend returns a generic non-field
 * error and the UI still wants a one-line summary.
 */
export function summariseFieldErrors(fields: FieldErrors): string {
  const lines: string[] = [];
  for (const [field, msgs] of Object.entries(fields)) {
    if (msgs?.[0]) {
      lines.push(`${field}: ${msgs[0]}`);
    }
  }
  return lines.join("\n");
}
