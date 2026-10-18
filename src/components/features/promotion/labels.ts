import type { PromotionResult, PromotionStatus } from "@/lib/query/queries/use-promotion";

export const STATUS_LABEL: Record<PromotionStatus, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  approved: "Disetujui",
  executed: "Dieksekusi",
};

export const STATUS_ORDER: PromotionStatus[] = ["draft", "submitted", "approved", "executed"];

export const RESULT_LABEL: Record<PromotionResult, string> = {
  promote: "Naik",
  retain: "Tinggal",
  graduate: "Lulus",
};

export function statusBadgeVariant(status: PromotionStatus): "default" | "secondary" | "outline" {
  if (status === "executed") return "secondary";
  if (status === "approved") return "default";
  return "outline";
}
