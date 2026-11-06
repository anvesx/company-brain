import type { ScanPage, ScanQuery } from "./scan/scan.js";

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
  edgesBySource(tenant: string, source: string, kind: EdgeKind): Edge[];
  node(tenant: string, id: string, asOf?: number): GraphNode | undefined;
  neighbors(tenant: string, id: string, opts?: { kind?: EdgeKind; dir?: "out" | "in"; asOf?: number }): Edge[];
  reach(tenant: string, from: string, opts: { kinds: EdgeKind[]; depth: number; limit: number; asOf?: number }): GraphNode[];
  /** Many `node()` reads in a few queries: the nodes among `ids` valid at `asOf`, sorted by id, missing and duplicate ids dropped. At most 100,000 ids, else BAD_INPUT. */
  nodesOf(tenant: string, ids: string[], asOf?: number): GraphNode[];
  /** Many `neighbors()` reads in a few queries: edges out of (`dir: "out"`) or into (`"in"`) any id, optionally only `kinds`. Same id limit as `nodesOf`. */
  edgesOf(tenant: string, ids: string[], opts: { dir: "out" | "in"; kinds?: EdgeKind[]; asOf?: number }): Edge[];
  history(tenant: string, id: string): GraphNode[];
  searchTitles(
    tenant: string,
    q: { text: string; kinds?: NodeKind[]; limit: number; after?: string; asOf?: number; reachedBy?: { from: string[]; kind: EdgeKind; only?: NodeKind } },
  ): GraphNode[];
  /** Title search in insertion order whose cost is bounded by `cap` candidates, not by the size of the graph. */
  scanTitles(tenant: string, q: ScanQuery): ScanPage;
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
/** True when the string has a NUL (Postgres text cannot hold it) or a lone surrogate (not valid UTF-8). */
export const unsafe = (v: string): boolean => v.includes("\u0000") || !(v as unknown as { isWellFormed(): boolean }).isWellFormed();
export const text = (name: string, v: unknown): string =>
  typeof v === "string" && v !== "" && !unsafe(v) ? v : bad(`${name} must be a non-empty string without NUL or lone surrogates`);
export const time = (name: string, v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : bad(`${name} must be a finite number`));
export const oneOf = (name: string, v: unknown, all: readonly string[]): string =>
  typeof v === "string" && all.includes(v) ? v : bad(`${name} is not a known kind`);
