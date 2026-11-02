import type { Connector } from "@anvesx/connector-kit";
import type { GraphStore } from "@anvesx/graph-store";

export interface SyncDeps {
  store: GraphStore;
  connector: Connector;
  tenant: string;
  now: () => number;
  resolve?: (kind: "person" | "team", raw: string) => string;
}

/** An entry the run left out because its input was invalid. A skipped document keeps no `can-read` edge from this connector. */
export interface SyncSkip {
  address: string;
  message: string;
}

/** What this run wrote: `nodes` and `edges` are rows added or superseded, `removed` is tombstoned documents, `skipped` the bad entries. */
export interface SyncReport {
  nodes: number;
  edges: number;
  removed: number;
  pages: number;
  skipped: SyncSkip[];
}

export type SyncErrorCode = "ABORTED" | "CONNECTOR_FAILED" | "BAD_INPUT" | "SUPERSEDED";

/** Typed failure of a sync run. Callers branch on `code`, never on the message. */
export class SyncError extends Error {
  readonly code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "SyncError";
    this.code = code;
  }
}
