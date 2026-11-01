import type { Readable, Writable } from "node:stream";
import type { CursorStore } from "@brain/change-cursor";
import type { Connector } from "@brain/connector-kit";
import type { Pointer, Principal } from "@brain/core-types";
import type { Governance } from "@brain/governance";
import type { IngestionCounts } from "@brain/ingestion";

export type BrainDeps = {
  connector: Connector;
  cursors: CursorStore;
  /** Milliseconds. Drives ingestion cursors and audit timestamps. */
  clock: () => number;
  embed: (texts: string[]) => Promise<number[][]>;
  embedQuery: (text: string) => Promise<number[]>;
  fetchText: (pointer: Pointer) => Promise<string>;
  /** Derives the caller from transport metadata; must throw when unauthenticated. */
  principalFor: (extra: unknown) => Principal;
  /** Secret for keyed query digests in audit rows. Never hard-code outside demo. */
  auditKey: string | Uint8Array;
  auditDbPath: string;
  /** Checkpoint log. Keep it outside the audit database. */
  anchorPath: string;
  transport: "http" | "stdio";
  /** http only; 0 or omitted picks a free port. */
  port?: number | undefined;
  /** Vector size. Omitted: measured by embedding one probe text at startup. */
  dimension?: number | undefined;
  /** stdio only; default to process stdin and stdout. */
  stdin?: Readable | undefined;
  stdout?: Writable | undefined;
};

export type SearchInput = { query: string; principal: Principal; limit?: number };

export type BrainApp = {
  ingest(tenantId: string): Promise<IngestionCounts>;
  /** Audited search, the same path the MCP tool uses. */
  search(input: SearchInput): Promise<Pointer[]>;
  verify: Governance["verify"];
  checkpoint: Governance["checkpoint"];
  /** Idempotent. */
  close(): Promise<void>;
  port: number | undefined;
};
