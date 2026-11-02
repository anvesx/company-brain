export type NodeKind = "person" | "team" | "document" | "repo" | "channel" | "ticket" | "project";
export type EdgeKind = "authored" | "member-of" | "mentions" | "links-to" | "belongs-to" | "can-read";
export interface GraphNode {
  tenant: string;
  id: string;
  kind: NodeKind;
  source: string;
  address: string;
  title: string;
  version: string;
  props: Record<string, string>;
}
export interface Edge {
  tenant: string;
  from: string;
  to: string;
  kind: EdgeKind;
  source: string;
}
export interface GraphStore {
  upsertNode(n: GraphNode, at: number): void;
  addEdge(e: Edge, at: number): void;
  removeEdge(e: Edge, at: number): void;
  tombstone(tenant: string, id: string, at: number): void;
  node(tenant: string, id: string, asOf?: number): GraphNode | undefined;
  neighbors(tenant: string, id: string, opts?: { kind?: EdgeKind; dir?: "out" | "in"; asOf?: number }): Edge[];
  reach(tenant: string, from: string, opts: { kinds: EdgeKind[]; depth: number; limit: number; asOf?: number }): GraphNode[];
  history(tenant: string, id: string): GraphNode[];
  close(): void;
}

export const NODE_KINDS: readonly string[] = ["person", "team", "document", "repo", "channel", "ticket", "project"];
export const EDGE_KINDS: readonly string[] = ["authored", "member-of", "mentions", "links-to", "belongs-to", "can-read"];
export const MAX_DEPTH = 6;
/** Stand-in for "now": a row is current exactly when it is valid at this time. */
export const NOW = Number.MAX_VALUE;

type Code = "BAD_INPUT" | "DEPTH_LIMIT" | "CLOSED";
/** Typed failure of the graph store. Callers branch on `code`, never on the message. */
export class GraphError extends Error {
  readonly code: Code;
  constructor(code: Code, message: string) {
    super(message);
    this.name = "GraphError";
    this.code = code;
  }
}

export const bad = (message: string): never => {
  throw new GraphError("BAD_INPUT", message);
};
export const text = (name: string, v: unknown): string => (typeof v === "string" && v !== "" ? v : bad(`${name} must be a non-empty string`));
export const time = (name: string, v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : bad(`${name} must be a finite number`));
export const oneOf = (name: string, v: unknown, all: readonly string[]): string =>
  typeof v === "string" && all.includes(v) ? v : bad(`${name} is not a known kind`);
