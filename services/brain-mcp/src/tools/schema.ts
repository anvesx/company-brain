import type { GraphNode, GraphStore, NodeKind } from "@anvesx/graph-store";
import { z } from "zod";

export const TOOL_NAMES = ["brain.search", "brain.node", "brain.graph", "brain.connectors"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
const KINDS = ["person", "team", "document", "repo", "channel", "ticket", "project"] as const satisfies readonly NodeKind[];

/** What every handler gets: the graph, who is asking (from the token, never from arguments) and the linked accounts. */
export interface Ctx {
  store: GraphStore;
  caller: { tenant: string; user: string };
  accounts: (user: string) => Promise<Record<string, unknown>[]>;
}

/** Tool arguments. A wrong type or an oversize value fails here, before any handler runs. */
export const INPUT = {
  "brain.search": z.object({
    query: z.string().max(512).describe("Text to find in node titles (case-insensitive for ASCII)."),
    kinds: z.array(z.enum(KINDS)).optional().describe("Only nodes of these kinds."),
    limit: z.number().int().min(1).max(100).default(20).describe("Most results to return."),
    cursor: z
      .string()
      .regex(/^\d{1,15}$/, "must be the `next` of a previous page")
      .optional()
      .describe("The `next` value of the previous page."),
  }),
  "brain.node": z.object({
    id: z.string().min(1).max(512).describe("Node id."),
    asOf: z.number().optional().describe("Read the graph as it was at this time (epoch milliseconds)."),
  }),
  "brain.graph": z.object({
    cursor: z.string().max(512).optional().describe("The `next` value of the previous page."),
    limit: z.number().int().min(1).max(20_000).default(5000).describe("Most nodes per page."),
  }),
  "brain.connectors": z.object({}),
};

const node = z.object({ id: z.string(), kind: z.enum(KINDS), source: z.string(), title: z.string(), group: z.string() });
const edge = z.object({ from: z.string(), to: z.string(), kind: z.string(), source: z.string() });

/** Tool results. The SDK checks each success against these before it leaves the server. */
/**
 * An error result carries { code, message } in structuredContent, and the client checks that against the tool's
 * output schema too. The SDK needs an object schema (no union), so every field becomes optional and the two error
 * fields are added.
 */
const orFailure = <S extends z.ZodRawShape>(ok: z.ZodObject<S>) => ok.partial().extend({ code: z.string().optional(), message: z.string().optional() });

export const OUTPUT = {
  "brain.search": orFailure(z.object({ nodes: z.array(node), next: z.string().optional(), truncated: z.boolean().optional() })),
  "brain.node": orFailure(
    z.object({
      node: node.extend({ address: z.string(), version: z.string(), props: z.record(z.string(), z.string()) }),
      neighbours: z.array(edge),
      truncated: z.boolean().optional(),
    }),
  ),
  "brain.graph": orFailure(z.object({ nodes: z.array(node), edges: z.array(edge), categories: z.record(z.string(), z.number()), next: z.string().optional() })),
  "brain.connectors": orFailure(z.object({ providers: z.array(z.object({ id: z.string(), status: z.string(), linkedAt: z.string().optional() })) })),
};

/** The public face of a node: no tenant, no address. `group` is what a graph view clusters on. */
export const publicNode = (n: GraphNode) => ({ id: n.id, kind: n.kind, source: n.source, title: n.title, group: `${n.kind}:${n.source}` });
