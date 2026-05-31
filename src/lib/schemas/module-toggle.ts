import { z } from "zod";

export const moduleToggleSchema = z.object({
  feature_code: z.string().min(1),
  enabled: z.boolean(),
});

export type ModuleToggleValues = z.infer<typeof moduleToggleSchema>;
