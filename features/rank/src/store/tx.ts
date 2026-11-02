import type { DatabaseSync } from "node:sqlite";

/** One read snapshot (WAL): every statement of a search sees the same committed state. */
export const readTx = <T>(db: DatabaseSync, fn: () => T): T => {
  db.exec("BEGIN");
  try {
    return fn();
  } finally {
    db.exec("COMMIT");
  }
};

/** All or nothing. A concurrent reader sees the whole write or none of it. */
export const writeTx = <T>(db: DatabaseSync, fn: () => T): T => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};
