import { DatabaseSync } from "node:sqlite";
import type { Doc, PermStore } from "../../src/gate.js";

type Row = Record<string, unknown>;

/** A real SQL database with the graph-store tables, answering the two reads the gate makes. */
export function sqlStore() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE nodes (tenant, id, kind, source, address, title, version, props, valid_to)");
  db.exec("CREATE TABLE edges (tenant, from_id, to_id, kind, valid_to)");
  const marks = (ids: string[]) => ids.map(() => "?").join(",");
  const store: PermStore = {
    nodesOf: (tenant, ids) =>
      (db.prepare(`SELECT * FROM nodes WHERE tenant = ? AND valid_to IS NULL AND id IN (${marks(ids)})`).all(tenant, ...ids) as Row[]).map(
        (r) => ({ ...r, props: JSON.parse(String(r["props"])) }) as unknown as Doc,
      ),
    edgesOf: (tenant, ids, o) => {
      const end = o.dir === "out" ? "from_id" : "to_id";
      const sql = `SELECT from_id AS "from", to_id AS "to" FROM edges WHERE tenant = ? AND valid_to IS NULL AND ${end} IN (${marks(ids)}) AND kind IN (${marks(o.kinds)})`;
      return db.prepare(sql).all(tenant, ...ids, ...o.kinds) as { from: string; to: string }[];
    },
  };
  const node = (id: string, kind: string, props: Record<string, string> = {}) =>
    db.prepare("INSERT INTO nodes VALUES ('t', ?, ?, 'drive', ?, ?, '1', ?, NULL)").run(id, kind, `addr-${id}`, id, JSON.stringify(props));
  const edge = (from: string, to: string, kind: string) => db.prepare("INSERT INTO edges VALUES ('t', ?, ?, ?, NULL)").run(from, to, kind);
  return { store, node, edge };
}
