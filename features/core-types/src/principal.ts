import { z } from "zod";

/** A tenant, user, group or document id: 1 to 256 UTF-16 units, no lone surrogates (they would not survive UTF-8). */
export const IdSchema = z
  .string()
  .min(1)
  .max(256)
  .refine((v) => v.isWellFormed(), "must be well-formed Unicode (no lone surrogates)");
const Id = IdSchema;

export const PrincipalSchema = z.object({
  id: Id,
  tenantId: Id,
  groups: z.array(Id).max(1000).default([]),
});
export type Principal = z.infer<typeof PrincipalSchema>;
