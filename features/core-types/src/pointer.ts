import { z } from "zod";
import { AclSchema } from "./acl.js";
import { IdSchema } from "./principal.js";
import { ZoneSchema } from "./zone.js";

/** One row per document. Holds where it is, never what it says. */
export const PointerSchema = z
  .object({
    id: IdSchema,
    tenantId: IdSchema,
    source: z.string().min(1).max(64),
    address: z.string().min(1).max(2048),
    title: z.string().max(1024).default(""),
    version: z.string().min(1).max(256),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    zone: ZoneSchema,
    acl: AclSchema,
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable().default(null),
  })
  .strict();
export type Pointer = z.infer<typeof PointerSchema>;
