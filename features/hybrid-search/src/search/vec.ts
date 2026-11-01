import type { DatabaseSync } from "node:sqlite";
import type { AclFragment } from "../index.js";
import { sqlParams } from "./db.js";

const MAX_KNN = 4096;

export function createVec(db: DatabaseSync, dim: number): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(embedding float[${dim}])`);
}

export function addVec(
  db: DatabaseSync,
  rowid: number,
  embedding: number[],
): void {
  db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
    BigInt(rowid),
    new Float32Array(embedding),
  );
}

export function searchVec(
  db: DatabaseSync,
  embedding: number[],
  limit: number,
  acl: AclFragment,
): string[] {
  const sql = `SELECT chunks.chunk_id AS id FROM chunks_vec
    JOIN chunks ON chunks.rowid = chunks_vec.rowid
    WHERE chunks_vec.embedding MATCH ? AND k = ? AND (${acl.sql})
    ORDER BY chunks_vec.distance, chunks.chunk_id LIMIT ?`;
  const params = sqlParams(acl.params);
  const total = Number(db.prepare("SELECT count(*) AS n FROM chunks").get()?.n);
  const allowed = Number(db.prepare(
    `SELECT count(*) AS n FROM chunks WHERE (${acl.sql})`,
  ).get(...params)?.n);
  if (allowed === 0) return [];
  const cap = Math.min(total, MAX_KNN);
  let candidates = allowed === total ? limit : Math.min(cap, limit * 8);
  let rows: Record<string, unknown>[] = [];
  while (candidates > 0 && limit <= MAX_KNN) {
    rows = db.prepare(sql).all(
      new Float32Array(embedding),
      candidates,
      ...params,
      limit,
    );
    if (rows.length >= limit || candidates >= total) break;
    if (candidates >= cap) return exactScan(db, embedding, limit, acl);
    candidates = Math.min(cap, candidates * 2);
  }
  return rows.map((row) => String(row.id));
}

// vec0 caps knn at 4096; selective ACLs fall back to a scan over allowed rows.
function exactScan(
  db: DatabaseSync,
  embedding: number[],
  limit: number,
  acl: AclFragment,
): string[] {
  const sql = `SELECT chunks.chunk_id AS id FROM chunks
    JOIN chunks_vec ON chunks_vec.rowid = chunks.rowid
    WHERE (${acl.sql})
    ORDER BY vec_distance_l2(chunks_vec.embedding, ?), chunks.chunk_id LIMIT ?`;
  return db.prepare(sql).all(
    ...sqlParams(acl.params),
    new Float32Array(embedding),
    limit,
  ).map((row) => String(row.id));
}
