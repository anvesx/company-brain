import { z } from "zod";

const Id = z.string().min(1).max(256);

export const PrincipalSchema = z.object({
  id: Id,
  tenantId: Id,
  groups: z.array(Id).max(1000).default([]),
});
export type Principal = z.infer<typeof PrincipalSchema>;
