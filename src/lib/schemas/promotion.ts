import { z } from "zod";

export const PROMOTION_RESULTS = ["promote", "retain", "graduate"] as const;
export type PromotionResultValue = (typeof PROMOTION_RESULTS)[number];

function isAverage(value: string) {
  if (value === "") return true;
  const n = Number(value);
  return !Number.isNaN(n) && n >= 0 && n <= 100;
}

function isCount(value: string) {
  if (value === "") return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

/** Criteria as typed (strings); keys match the backend so server field errors map. */
export const criteriaFormSchema = z.object({
  min_average: z.string().trim().refine(isAverage, "Isi 0–100 atau kosongkan"),
  max_subjects_below_kkm: z
    .string()
    .trim()
    .refine(isCount, "Isi bilangan bulat 0 atau lebih, atau kosongkan"),
});
export type CriteriaForm = z.infer<typeof criteriaFormSchema>;

export type CriteriaPayload = {
  min_average: number | null;
  max_subjects_below_kkm: number | null;
  min_attendance_percent: null;
};

export function toCriteriaPayload(values: CriteriaForm): CriteriaPayload {
  const average = values.min_average.trim();
  const count = values.max_subjects_below_kkm.trim();
  return {
    min_average: average === "" ? null : Number(average),
    max_subjects_below_kkm: count === "" ? null : Number(count),
    min_attendance_percent: null,
  };
}

export function criteriaToForm(criteria: {
  min_average: number | null;
  max_subjects_below_kkm: number | null;
  min_attendance_percent: number | null;
}): CriteriaForm {
  return {
    min_average: criteria.min_average === null ? "" : String(criteria.min_average),
    max_subjects_below_kkm:
      criteria.max_subjects_below_kkm === null ? "" : String(criteria.max_subjects_below_kkm),
  };
}

/** A reason is required (≥ 10 chars trimmed) unless the result returns to the recommendation. */
export function overrideSchema(recommended: PromotionResultValue) {
  return z
    .object({
      result: z.enum(PROMOTION_RESULTS),
      reason: z.string(),
    })
    .superRefine((value, ctx) => {
      if (value.result !== recommended && value.reason.trim().length < 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "Alasan minimal 10 karakter" });
      }
    });
}
export type OverrideForm = { result: PromotionResultValue; reason: string };

export const targetYearSchema = z.object({
  target_academic_year_id: z.string().uuid("Pilih tahun tujuan"),
});
export type TargetYearForm = z.infer<typeof targetYearSchema>;
