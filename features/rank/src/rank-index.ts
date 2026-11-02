import type { DatabaseSync } from "node:sqlite";
import { RankError } from "./model/errors.js";
import type { Doc, Hit, OpenOptions, Probe, SearchRequest } from "./model/types.js";
import { validateDoc, validateRequest } from "./model/validate.js";
import { rankSearch } from "./rank-search.js";
import { openDb } from "./store/schema.js";
import { removeDocs, upsertDocs } from "./store/write.js";
import { WEIGHTS } from "./text/formula.js";

/** A pointer index over one SQLite file. Synchronous: each call is one transaction. */
export class RankIndex {
  private db: DatabaseSync | null;
  private readonly opts: Required<OpenOptions>;

  private constructor(db: DatabaseSync, opts: Required<OpenOptions>) {
    this.db = db;
    this.opts = opts;
  }

  static open(file: string, opts: OpenOptions = {}): RankIndex {
    return new RankIndex(openDb(file), { now: opts.now ?? Date.now, weights: opts.weights ?? WEIGHTS });
  }

  index(docs: readonly Doc[]): { indexed: number } {
    const db = this.handle();
    if (!Array.isArray(docs)) throw new RankError("BAD_DOC", "docs must be an array");
    return { indexed: upsertDocs(db, docs.map(validateDoc)) };
  }

  remove(ids: readonly string[]): { removed: number } {
    return { removed: removeDocs(this.handle(), ids) };
  }

  search(req: SearchRequest, probe?: Probe): Hit[] {
    const db = this.handle();
    const { query, principals, k } = validateRequest(req);
    return rankSearch(db, query, { principals, k, now: this.opts.now(), weights: this.opts.weights, probe });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private handle(): DatabaseSync {
    if (!this.db) throw new RankError("CLOSED", "index is closed");
    return this.db;
  }
}
