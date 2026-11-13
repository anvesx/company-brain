type Pool = { query(sql: string, args?: unknown[]): Promise<unknown> };
const canon = (p: Record<string, string>): string => JSON.stringify(Object.entries(p).sort(([a], [b]) => (a < b ? -1 : 1)));
/** Bulk-inserts `n` current documents `<prefix><i>` in graph-store's row format, each readable by `readers`. */
export async function bulk(
  pool: Pool,
  tenant: string,
  prefix: string,
  n: number,
  f: (i: number) => { title: string; source?: string; props: Record<string, string> },
  readers = ["alice"],
) {
  const rows = Array.from({ length: n }, (_, i) => f(i));
  const sql = `INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from) SELECT $1,$2||(x.i-1),'document',x.s,'a/'||x.i,x.t,'1',x.p,1 FROM unnest($3::text[],$4::text[],$5::text[]) WITH ORDINALITY AS x(t,p,s,i)`;
  await pool.query(sql, [tenant, prefix, rows.map((r) => r.title), rows.map((r) => canon(r.props)), rows.map((r) => r.source ?? "gdrive")]);
  for (const r of readers)
    await pool.query("INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT $1,$2,$3||g,'can-read','t',1 FROM generate_series(0,$4) g", [
      tenant,
      r,
      prefix,
      n - 1,
    ]);
}
