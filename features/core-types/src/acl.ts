import { z } from "zod";
import { IdSchema } from "./principal.js";

const Id = IdSchema;

export const AclSchema = z.object({
  allowUsers: z.array(Id).default([]),
  allowGroups: z.array(Id).default([]),
  version: z.number().int().nonnegative(),
});
export type Acl = z.infer<typeof AclSchema>;
