import { DatabaseSync } from "node:sqlite";
import type { Acl } from "@brain/core-types";
import * as sqliteVec from "sqlite-vec";
import { SearchError } from "../errors.js";
import type { AddChunk, Hit, SearchIndex, SearchQuery } from "../index.js";
import { rrf } from "../rrf.js";
import { addFts, createFts, searchFts } from "./fts.js";
import { validateEmbedding, validText } from "./validate.js";
import { addVec, createVec, searchVec } from "./vec.js";

function initialize(path: string, dim: number): DatabaseSync {
  if (!Number.isInteger(dim) || dim < 1 || dim > 4096) throw new SearchError("DIM");
  const db = new DatabaseSync(path, { allowExtension: true });
  sqliteVec.load(db);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000");
  db.exec(
    "CREATE TABLE IF NOT EXISTS chunks (chunk_id TEXT UNIQUE NOT NULL, doc_id TEXT NOT NULL, tenant_id TEXT NOT NULL, text TEXT NOT NULL, acl TEXT NOT NULL)",
  );
  db.exec("CREATE INDEX IF NOT EXISTS chunks_tenant ON chunks(tenant_id)");
  createFts(db);
  createVec(db, dim);
  return db;
}

export function createSearchIndex(path: string, dim: number): SearchIndex {
  const db = initialize(path, dim);
  return {
    add(chunk: AddChunk): void {
      validateEmbedding(chunk?.embedding, dim);
      if (!validText(chunk?.chunkId) || !validText(chunk?.docId) || !validText(chunk?.tenantId) || typeof chunk?.text !== "string")
        throw new SearchError("INPUT");
      db.exec("BEGIN IMMEDIATE");
      try {
        const rowid = Number(
          db
            .prepare("INSERT INTO chunks(chunk_id,doc_id,tenant_id,text,acl) VALUES(?,?,?,?,?)")
            .run(chunk.chunkId, chunk.docId, chunk.tenantId, chunk.text, JSON.stringify(chunk.acl satisfies Acl)).lastInsertRowid,
        );
        addFts(db, rowid, chunk.text);
        addVec(db, rowid, chunk.embedding);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw new SearchError(String(error).includes("UNIQUE") ? "DUPLICATE" : "DB", error);
      }
    },
    search(query: SearchQuery): Hit[] {
      validateEmbedding(query?.embedding, dim);
      if (!Number.isInteger(query?.limit) || query.limit < 1 || query.limit > 100) throw new SearchError("LIMIT");
      if (typeof query.text !== "string" || typeof query.acl?.sql !== "string" || query.acl.sql.trim() === "") throw new SearchError("INPUT");
      const ranked = rrf([searchFts(db, query.text, query.limit, query.acl), searchVec(db, query.embedding, query.limit, query.acl)]).slice(0, query.limit);
      const find = db.prepare("SELECT doc_id FROM chunks WHERE chunk_id = ?");
      return ranked.map(({ id, score }) => ({ chunkId: id, docId: String(find.get(id)!.doc_id), score }));
    },
    remove(docId: string): number {
      if (!validText(docId)) throw new SearchError("INPUT");
      db.exec("BEGIN IMMEDIATE");
      try {
        const ids = db
          .prepare("SELECT rowid FROM chunks WHERE doc_id=?")
          .all(docId)
          .map((r) => Number(r.rowid));
        for (const id of ids) {
          db.prepare("DELETE FROM chunks_fts WHERE rowid=?").run(id);
          db.prepare("DELETE FROM chunks_vec WHERE rowid=?").run(id);
        }
        db.prepare("DELETE FROM chunks WHERE doc_id=?").run(docId);
        db.exec("COMMIT");
        return ids.length;
      } catch (error) {
        db.exec("ROLLBACK");
        throw new SearchError("DB", error);
      }
    },
  };
}
