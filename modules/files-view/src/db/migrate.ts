import type pg from "pg";

// props is graph-store's sorted JSON text: [["owner","ana"],...]. These immutable helpers read one key so btree expression indexes can sort on it.
const PROP = `CREATE OR REPLACE FUNCTION fv_prop(p text, k text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$SELECT COALESCE((SELECT e->>1 FROM jsonb_array_elements(p::jsonb) e WHERE e->>0 = k LIMIT 1), '')$$`;
const NUM = `CREATE OR REPLACE FUNCTION fv_num(p text, k text) RETURNS bigint LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$SELECT CASE WHEN v ~ '^[0-9]{1,18}$' THEN v::bigint ELSE 0 END FROM (SELECT fv_prop(p, k) AS v) s$$`;
// Not PARALLEL SAFE: its exception block starts a subtransaction. Epoch milliseconds of an ISO-8601 prop (a zone offset is honoured, none means UTC); NULL when it is not a date. Ranges compare these, never text.
const TS = `CREATE OR REPLACE FUNCTION fv_ts(p text, k text) RETURNS bigint LANGUAGE plpgsql IMMUTABLE AS
  $$DECLARE v text := fv_prop(p, k);
  BEGIN
    IF v !~ '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2})?)?$' THEN RETURN NULL; END IF;
    IF v ~ '(Z|[+-]\\d{2}:\\d{2})$' THEN RETURN floor(extract(epoch FROM v::timestamptz) * 1000)::bigint; END IF;
    RETURN floor(extract(epoch FROM (v::timestamp AT TIME ZONE 'UTC')) * 1000)::bigint;
  EXCEPTION WHEN others THEN RETURN NULL;
  END$$`;
const DOC = "WHERE valid_to IS NULL AND kind = 'document'";
const CLU = "WHERE valid_to IS NULL AND kind = 'project'";
const EDGE = (kind: string) => `WHERE kind = '${kind}' AND valid_to IS NULL`;

const KEYS = { modified: `(COALESCE(fv_ts(props, 'modified'), 0))`, title: `(title COLLATE "C")`, size: "fv_num(props, 'size')" }; // the three orders of list.ts KEY
const FILTERS = { source: "source", mime: "fv_prop(props, 'mime')", owner: "fv_prop(props, 'owner')" };
/** One index per (filter, order): a filtered page then reads its first rows in order from the index and never sorts the filtered set. */
const filtered = Object.fromEntries(
  Object.entries(FILTERS).flatMap(([f, col]) =>
    Object.entries(KEYS).map(([k, key]) => [`fv_doc_${f}${k === "modified" ? "" : `_${k}`}`, `nodes (tenant, ${col}, ${key}, id) ${DOC}`]),
  ),
);

/** Every index the screen's hot queries rely on. Names are part of the contract. */
export const INDEXES: Record<string, string> = {
  fv_doc_modified: `nodes (tenant, ${KEYS.modified}, id) ${DOC}`,
  fv_doc_title: `nodes (tenant, ${KEYS.title}, id) ${DOC}`,
  fv_doc_size: `nodes (tenant, ${KEYS.size}, id) ${DOC}`,
  ...filtered,
  fv_title_icu: `nodes USING gin ((lower(title COLLATE "und-x-icu")) gin_trgm_ops) ${DOC}`, // non-ASCII search (list.ts folds case with ICU)
  fv_cluster_parent: `nodes (tenant, fv_prop(props, 'cluster.parent'), id) ${CLU}`,
  fv_cluster_id: `nodes (tenant, id) ${CLU}`,
  fv_member_of: `edges (tenant, from_id) INCLUDE (to_id) ${EDGE("belongs-to")}`,
  fv_members: `edges (tenant, to_id, from_id) ${EDGE("belongs-to")}`,
  fv_readers: `edges (tenant, to_id, from_id) ${EDGE("can-read")}`,
};

/** Adds the read-side indexes under an advisory lock. Call after the graph-store tables exist; safe to repeat and to run in parallel. */
export async function migrate(pool: pg.Pool): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query("SELECT pg_advisory_lock(7410002)");
    await c.query(PROP);
    await c.query(NUM);
    await c.query(TS);
    for (const [name, def] of Object.entries(INDEXES)) await c.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${def}`);
  } finally {
    await c.query("SELECT pg_advisory_unlock(7410002)").catch(() => undefined);
    c.release();
  }
}
