import type { AsyncGraphStore } from "@anvesx/graph-store";
import type pg from "pg";

export type FileOpt = {
  tenant?: string;
  title?: string;
  owner?: string;
  zone?: string;
  mime?: string;
  size?: string;
  modified?: string;
  source?: string;
  readers?: string[];
  props?: Record<string, string>;
};
const ALL = ["alice", "bob", "carol"];

/** Seeding through the real graph-store (single rows) or direct SQL in its row format (bulk). */
export function seeder(pool: pg.Pool, store: AsyncGraphStore) {
  const at = 1;
  const file = async (id: string, o: FileOpt = {}) => {
    const t = o.tenant ?? "t1";
    const props = {
      owner: o.owner ?? "alice",
      zone: o.zone ?? "company",
      mime: o.mime ?? "text/plain",
      size: o.size ?? "10",
      modified: o.modified ?? "2026-01-01T00:00:00Z",
      ...o.props,
    };
    await store.upsertNode({ tenant: t, id, kind: "document", source: o.source ?? "drive", address: `a/${id}`, title: o.title ?? id, version: "1", props }, at);
    for (const r of o.readers ?? ALL) await store.addEdge({ tenant: t, from: r, to: id, kind: "can-read", source: "drive" }, at);
  };
  const cluster = (id: string, o: { tenant?: string; title?: string; type?: string; why?: string; parent?: string | undefined } = {}) =>
    store.upsertNode(
      {
        tenant: o.tenant ?? "t1",
        id,
        kind: "project",
        source: "brain",
        address: `c/${id}`,
        title: o.title ?? id,
        version: "1",
        props: {
          "cluster.type": o.type ?? "topic",
          ...(o.why === undefined ? {} : { "cluster.why": o.why }),
          ...(o.parent ? { "cluster.parent": o.parent } : {}),
        },
      },
      at,
    );
  const link = (doc: string, cl: string, tenant = "t1") => store.addEdge({ tenant, from: doc, to: cl, kind: "belongs-to", source: "brain" }, at);
  /** Bulk insert `n` current documents (+ can-read for `readers`) in the graph-store row format. */
  const bulk = async (n: number, f: (i: number) => { title: string; props: Record<string, string> }, o: { tenant?: string; readers?: string[] } = {}) => {
    const rows = Array.from({ length: n }, (_, i) => f(i));
    const t = o.tenant ?? "t1";
    await pool.query(
      `INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from) SELECT $1,'b'||(x.i-1),'document','drive','a/'||x.i,x.title,'1',x.props,1 FROM unnest($2::text[],$3::text[]) WITH ORDINALITY AS x(title,props,i)`,
      [t, rows.map((r) => r.title), rows.map((r) => JSON.stringify(Object.entries(r.props).sort(([a], [b]) => (a < b ? -1 : 1))))],
    );
    for (const r of o.readers ?? ALL)
      await pool.query(
        `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT $1,$2,'b'||g,'can-read','drive',1 FROM generate_series(0,$3) g`,
        [t, r, n - 1],
      );
  };
  return { file, cluster, link, bulk };
}
