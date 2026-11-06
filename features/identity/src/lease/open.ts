import { DatabaseSync } from "node:sqlite";

/** How long a write waits for another process's write to finish before it gives up with SQLITE_BUSY. */
export const BUSY_MS = 10_000;

/**
 * The one way to open the SQLite file. SQLite lets one writer in at a time and a second one fails at once unless told to wait,
 * which made a replica lose a lease race with STORE_FAILED. With a busy timeout it queues behind the other writer instead.
 */
export const openSqlite = (path: string): DatabaseSync => new DatabaseSync(path, { timeout: BUSY_MS });
