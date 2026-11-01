import type { Acl } from "@brain/core-types";

export type Hit = { chunkId: string; docId: string; score: number };
export type AclFragment = { sql: string; params: unknown[] };
export type AddChunk = {
  chunkId: string;
  docId: string;
  tenantId: string;
  text: string;
  embedding: number[];
  acl: Acl;
};
export type SearchQuery = {
  text: string;
  embedding: number[];
  limit: number;
  acl: AclFragment;
};
export interface SearchIndex {
  add(chunk: AddChunk): void;
  search(query: SearchQuery): Hit[];
  remove(docId: string, tenantId: string): number;
}

export { SearchError } from "./errors.js";
export { rrf } from "./rrf.js";
export { createSearchIndex } from "./search/index-db.js";
