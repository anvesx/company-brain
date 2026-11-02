import type { DatabaseSync } from "node:sqlite";
import { bad, type GraphNode, NODE_KINDS, NOW, oneOf, text, time } from "./schema.js";

/** Runs fn in one write transaction; BEGIN IMMEDIATE serialises writers across processes. */
export function tx(db: DatabaseSync, fn: () => void): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    fn();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const FORBIDDEN_KEYS = ["text", "body", "content"];
const MAX_VALUE_BYTES = 1024;
type Row = Record<string, unknown>;

function checkProps(props: unknown): Record<string, string> {
  if (typeof props !== "object" || props === null || Array.isArray(props)) return bad("props must be an object");
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.includes(k.toLowerCase())) bad(`props key "${k}" is not allowed: metadata only`);
    if (typeof v !== "string") bad(`props["${k}"] must be a string`);
    if (Buffer.byteLength(v, "utf8") > MAX_VALUE_BYTES) bad(`props["${k}"] is over 1 KiB`);
  }
  return props as Record<string, string>;
}

// Entries sorted by key so equal props always serialise to the same string.
const canon = (p: Record<string, string>): string => JSON.stringify(Object.entries(p).sort(([a], [b]) => (a < b ? -1 : 1)));

export function toNode(r: Row): GraphNode {
  return {
    tenant: r["tenant"] as string,
    id: r["id"] as string,
    kind: r["kind"] as GraphNode["kind"],
    source: r["source"] as string,
    address: r["address"] as string,
    title: r["title"] as string,
    version: r["version"] as string,
    props: Object.fromEntries(JSON.parse(r["props"] as string) as [string, string][]),
  };
}

export function nodeOps(db: DatabaseSync) {
  const cur = db.prepare("SELECT * FROM nodes WHERE tenant = ? AND id = ? AND valid_to IS NULL");
  const at = db.prepare("SELECT * FROM nodes WHERE tenant = ? AND id = ? AND valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)");
  const close = db.prepare("UPDATE nodes SET valid_to = ? WHERE tenant = ? AND id = ? AND valid_to IS NULL");
  const ins = db.prepare("INSERT INTO nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)");
  const hist = db.prepare("SELECT * FROM nodes WHERE tenant = ? AND id = ? ORDER BY valid_from, rowid");
  return {
    upsert(n: GraphNode, when: number): void {
      const t = text("tenant", n?.tenant),
        id = text("id", n.id),
        w = time("at", when);
      oneOf("kind", n.kind, NODE_KINDS);
      const props = canon(checkProps(n.props));
      const f = [n.source, n.address, n.title, n.version].map((v) => (typeof v === "string" ? v : bad("source, address, title, version must be strings")));
      tx(db, () => {
        const old = cur.get(t, id);
        if (old !== undefined) {
          const same =
            old["kind"] === n.kind && old["props"] === props && [old["source"], old["address"], old["title"], old["version"]].every((v, i) => v === f[i]);
          if (same) return;
          if (w < (old["valid_from"] as number)) bad("at is before the current row's validFrom");
          close.run(w, t, id);
        }
        ins.run(t, id, n.kind, f[0]!, f[1]!, f[2]!, f[3]!, props, w);
      });
    },
    close: (tenant: string, id: string, when: number): void => void close.run(time("at", when), text("tenant", tenant), text("id", id)),
    get(tenant: string, id: string, asOf?: number): GraphNode | undefined {
      const t = asOf === undefined ? NOW : time("asOf", asOf);
      const r = at.get(text("tenant", tenant), text("id", id), t, t);
      return r === undefined ? undefined : toNode(r);
    },
    history: (tenant: string, id: string): GraphNode[] => hist.all(text("tenant", tenant), text("id", id)).map(toNode),
  };
}
