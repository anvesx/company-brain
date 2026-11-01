import type { Chunk } from "@brain/chunker";
import type { Pointer } from "@brain/core-types";
import type { SearchIndex } from "@brain/hybrid-search";
import type { Registry } from "@brain/pointer-registry";

export type ChangeEvent = { type: "upsert"; pointer: Pointer } | { type: "delete"; tenantId: string; id: string; at: string };

export type ApplyResult = {
  outcome: "created" | "updated" | "unchanged" | "deleted" | "absent";
  chunks: number;
};

export type IndexDeps = {
  registry: Registry;
  index: SearchIndex;
  chunk: (docId: string, text: string) => Promise<Chunk[]>;
  embed: (texts: string[]) => Promise<number[][]>;
  fetchText: (pointer: Pointer) => Promise<string>;
};

export interface IndexService {
  apply(event: ChangeEvent): Promise<ApplyResult>;
}

export type IndexErrorCode =
  | "INVALID_EVENT"
  | "FETCH_FAILED"
  | "CHUNK_FAILED"
  | "EMBED_FAILED"
  | "EMBED_INVALID"
  | "INDEX_FAILED"
  | "CLEANUP_FAILED"
  | "ROLLBACK_FAILED";

export class IndexServiceError extends Error {
  readonly code: IndexErrorCode;

  constructor(code: IndexErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "IndexServiceError";
    this.code = code;
  }
}
