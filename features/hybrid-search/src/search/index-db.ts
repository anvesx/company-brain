import { DatabaseSync } from "node:sqlite";
import type { Acl } from "@brain/core-types";
import * as sqliteVec from "sqlite-vec";
import { SearchError } from "../errors.js";
import type { AddChunk, Hit, SearchIndex, SearchQuery } from "../index.js";
import { rrf } from "../rrf.js";
import { createChunks, hydrate, removeDoc, setAcl } from "./db.js";
import { addFts, createFts, searchFts } from "./fts.js";
import { validateEmbedding, validText } from "./validate.js";
import { addVec, createVec, searchVec } from "./vec.js";

function initialize(path: string, dim: number): DatabaseSync {
  if (!Number.isInteger(dim) || dim < 1 || dim > 4096) throw new SearchError("DIM");
  const db = new DatabaseSync(path, { allowExtension: true });
  sqliteVec.load(db);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000");
  createChunks(db);
  createFts(db);
  createVec(db, dim);
  return db;
}

export function createSearchIndex(path: string, dim: number): SearchIndex {
  const db = initialize(path, dim);
  const tx = <T>(fn: () => T): T => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      db.exec("COMMIT");
      return out;
    } catch (error) {
      db.exec("ROLLBACK");
      throw new SearchError(String(error).includes("UNIQUE") ? "DUPLICATE" : "DB", error);
    }
  };
  return {
    add(chunk: AddChunk): void {
      validateEmbedding(chunk?.embedding, dim);
      if (!validText(chunk?.chunkId) || !validText(chunk?.docId) || !validText(chunk?.tenantId) || typeof chunk?.text !== "string")
        throw new SearchError("INPUT");
      tx(() => {
        const insert = db.prepare("INSERT INTO chunks(chunk_id,doc_id,tenant_id,allow_users,allow_groups) VALUES(?,?,?,?,?)");
        const row = insert.run(chunk.chunkId, chunk.docId, chunk.tenantId, JSON.stringify(chunk.acl.allowUsers), JSON.stringify(chunk.acl.allowGroups));
        addFts(db, Number(row.lastInsertRowid), chunk.text);
        addVec(db, Number(row.lastInsertRowid), chunk.embedding);
      });
    },
    search(query: SearchQuery): Hit[] {
      validateEmbedding(query?.embedding, dim);
      if (!Number.isInteger(query?.limit) || query.limit < 1 || query.limit > 100) throw new SearchError("LIMIT");
      if (typeof query.text !== "string" || typeof query.acl?.sql !== "string" || query.acl.sql.trim() === "") throw new SearchError("INPUT");
      try {
        const lists = [searchFts(db, query.text, query.limit, query.acl), searchVec(db, query.embedding, query.limit, query.acl)];
        return hydrate(db, rrf(lists).slice(0, query.limit));
      } catch (error) {
        throw error instanceof SearchError ? error : new SearchError("DB", error);
      }
    },
    remove(docId: string, tenantId: string): number {
      if (!validText(docId) || !validText(tenantId)) throw new SearchError("INPUT");
      return tx(() => removeDoc(db, docId, tenantId));
    },
    updateAcl(docId: string, tenantId: string, acl: Acl): number {
      if (!validText(docId) || !validText(tenantId)) throw new SearchError("INPUT");
      return tx(() => setAcl(db, docId, tenantId, acl));
    },
  };
}
