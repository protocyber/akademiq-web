import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";

import type { Certificate } from "@/lib/query/queries/use-promotion-letters";

/** "2026-06-20" → "20 Juni 2026" as a local calendar date (never shifted by timezone). */
export function formatLetterDate(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return format(new Date(y, m - 1, d), "d MMMM yyyy", { locale: idLocale });
}

/** student_id → certificate number as typed; only edited rows are present. */
export type CertificateDraft = Record<string, string>;

const collator = new Intl.Collator("id", { sensitivity: "base" });

export function orderGraduates(rows: Certificate[]): Certificate[] {
  return [...rows].sort(
    (a, b) =>
      collator.compare(a.last_homeroom_name ?? "", b.last_homeroom_name ?? "") ||
      collator.compare(a.full_name ?? "", b.full_name ?? "") ||
      a.student_id.localeCompare(b.student_id),
  );
}

export function formatNumber(pattern: string, n: number, digits: number): string {
  return pattern.split("{n}").join(String(n).padStart(digits, "0"));
}

export function effectiveNumber(row: Certificate, draft: CertificateDraft): string {
  return row.student_id in draft ? draft[row.student_id] : (row.certificate_number ?? "");
}

/** Fills numbers from a pattern; filled rows consume the counter, skipped rows do not. */
export function buildCertificateNumbers(
  rows: Certificate[],
  draft: CertificateDraft,
  opts: { pattern: string; start: number; digits: number; overwrite: boolean },
): CertificateDraft {
  const next: CertificateDraft = { ...draft };
  let n = opts.start;
  for (const row of orderGraduates(rows)) {
    if (!opts.overwrite && effectiveNumber(row, draft).trim() !== "") continue;
    next[row.student_id] = formatNumber(opts.pattern, n, opts.digits);
    n += 1;
  }
  return next;
}

export function duplicateNumbers(rows: Certificate[], draft: CertificateDraft): Set<string> {
  const byNumber = new Map<string, string[]>();
  for (const row of rows) {
    const value = effectiveNumber(row, draft).trim();
    if (value === "") continue;
    byNumber.set(value, [...(byNumber.get(value) ?? []), row.student_id]);
  }
  const duplicates = new Set<string>();
  for (const ids of byNumber.values()) if (ids.length > 1) ids.forEach((id) => duplicates.add(id));
  return duplicates;
}

export function certificateChanges(
  rows: Certificate[],
  draft: CertificateDraft,
): { student_id: string; certificate_number: string }[] {
  const changes: { student_id: string; certificate_number: string }[] = [];
  for (const row of rows) {
    if (!(row.student_id in draft)) continue;
    const value = draft[row.student_id].trim();
    if (value !== (row.certificate_number ?? "")) changes.push({ student_id: row.student_id, certificate_number: value });
  }
  return changes;
}

const STUDENT_PREFIX = /^student ([0-9a-f-]{36}): (.*)$/i;

export function mapStudentErrors(
  messages: string[],
  knownIds: ReadonlySet<string>,
): { byStudent: Record<string, string[]>; unmatched: string[] } {
  const byStudent: Record<string, string[]> = {};
  const unmatched: string[] = [];
  for (const message of messages) {
    const match = STUDENT_PREFIX.exec(message);
    if (match && knownIds.has(match[1])) {
      (byStudent[match[1]] ??= []).push(match[2]);
    } else {
      unmatched.push(message);
    }
  }
  return { byStudent, unmatched };
}
