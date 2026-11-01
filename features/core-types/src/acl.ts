import { z } from "zod";

const Id = z.string().min(1).max(256);

export const AclSchema = z.object({
  allowUsers: z.array(Id).default([]),
  allowGroups: z.array(Id).default([]),
  version: z.number().int().nonnegative(),
});
export type Acl = z.infer<typeof AclSchema>;
