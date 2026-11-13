import type pg from "pg";

const ISO = `to_char(timestamp '2026-01-01' + ((g * 37) % 1000000) * interval '1 second', 'YYYY-MM-DD"T"HH24:MI:SS".000Z"')`;
const file = (t: string, n: number) => `INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from)
 SELECT '${t}','f'||g,'document',(ARRAY['gdrive','slack','notion','github'])[g%4+1],'src://'||g,'Report '||md5(g::text)||' q'||(g%9),'1',
 '[["folder","/f/'||(g%500)||'"],["mime","'||(ARRAY['application/pdf','text/plain','image/png'])[g%3+1]||'"],["modified","'||${ISO}||'"],["owner","u'||(g%200)||'"],["size","'||((g*7919)%5000000)||'"],["zone","company"]]',1
 FROM generate_series(1,${n}) g`;
const edge = (cond: string, to: string, kind: string) => `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from)
 SELECT 't1','f'||g,${to},'${kind}','s',1 FROM generate_series(1,100000) g ${cond} ON CONFLICT DO NOTHING`;
const person = (id: string, kind: string, edges: string) => `INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from)
 VALUES ('t1','${id}','${kind}','s','p://${id}','${id}','1','[]',1); ${edges}`;
const reads = (who: string, cond: string) => `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from)
 SELECT 't1','${who}','f'||g,'can-read','s',1 FROM generate_series(1,100000) g ${cond}`;

/** 100k t1 files, 25k t2 files with the same ids, 10% with a closed history row, 2,000 clusters (20 roots, 180 mids, 1,800 leaves), 1 giant leaf (c200 ~33k). */
export async function seedScale(pool: pg.Pool): Promise<void> {
  const q = (s: string) => pool.query(s);
  await q(file("t1", 100000));
  await q(file("t2", 25000));
  await q(`INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from,valid_to)
   SELECT 't1','f'||g,'document','gdrive','old','Old '||g,'0','[["owner","u0"]]',0,1 FROM generate_series(10,100000,10) g`);
  await q(`INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from)
   SELECT 't1','c'||g,'project','brain','b://'||g,'Cluster '||g,'1',
   CASE WHEN g<20 THEN '[' ELSE '[["cluster.parent","c'||(CASE WHEN g<200 THEN g%20 ELSE 20+g%180 END)||'"],' END ||
   '["cluster.type","'||(ARRAY['place','people','topic'])[g%3+1]||'"],["cluster.why","Same folder /f/'||g||'"]]',1 FROM generate_series(0,1999) g`);
  await q(edge("", "'c'||(200+(g*7+g/1800)%1800)", "belongs-to"));
  await q(edge("WHERE g%2=0", "'c'||(200+(g*13+g/1800)%1800)", "belongs-to"));
  await q(edge("WHERE g%3=0", "'c200'", "belongs-to"));
  await q(person("alice", "person", reads("alice", "WHERE g%50=0")));
  await q(person("bob", "person", reads("bob", "WHERE g%2=0")));
  await q("ANALYZE nodes; ANALYZE edges");
}

/** 200 distinct viewers v1..v200, all members of team "half" which can read every odd file: 200 different cold viewers, one 50k-edge ACL. */
export async function seedViewers(pool: pg.Pool): Promise<void> {
  await pool.query(person("half", "team", reads("half", "WHERE g%2=1")));
  await pool.query(`INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from)
   SELECT 't1','v'||g,'person','s','p://v'||g,'v'||g,'1','[]',1 FROM generate_series(1,200) g;
   INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't1','v'||g,'half','member-of','s',1 FROM generate_series(1,200) g`);
  await pool.query("ANALYZE nodes; ANALYZE edges");
}
