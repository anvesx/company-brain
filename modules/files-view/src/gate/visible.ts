import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { type ClusterPath, pathsFor, propsOf } from "../cluster/paths.js";
import type { ListQuery } from "../db/list.js";
import type { CountedGate } from "./gate.js";
import { scan } from "./scan.js";

export type FileRow = { id: string; title: string; source: string; props: Record<string, string>; readers?: string[]; paths: ClusterPath[] };
export type FilePage = { rows: FileRow[]; next?: string };

/**
 * One page of the files this viewer may see, in sort order. Candidates come from SQL in keyset order; `gate.approve` decides
 * which stay (tenant, zone, ACL, live recheck). A viewer who sees 1 file in 50 still gets full pages: the loop keeps fetching
 * until the page is full or candidates run out. `readers` is present only when the gate says the viewer owns the file or is admin.
 */
export async function visibleFiles(pool: pg.Pool, gate: Gate | CountedGate, tenant: string, q: ListQuery): Promise<FilePage> {
  const { kept, next } = await scan(pool, gate, tenant, q);
  const page = kept;
  const paths = await pathsFor(
    pool,
    tenant,
    page.map((p) => p.row["id"] as string),
  );
  const rows = page.map(({ row, readers }) => ({
    id: row["id"] as string,
    title: row["title"] as string,
    source: row["source"] as string,
    props: propsOf(row["props"] as string),
    ...(readers && { readers }),
    paths: paths.get(row["id"] as string) ?? [],
  }));
  return { rows, ...(next && { next }) };
}

/** One file by id, or undefined when it is missing or the gate hides it: the caller cannot tell which. */
export async function visibleFile(pool: pg.Pool, gate: Gate, tenant: string, id: string): Promise<FileRow | undefined> {
  const hit = (await gate.approve([id])).get(id);
  if (!hit) return undefined;
  const paths = await pathsFor(pool, tenant, [id]);
  return { id, title: hit.doc.title, source: hit.doc.source, props: hit.doc.props, ...(hit.readers && { readers: hit.readers }), paths: paths.get(id) ?? [] };
}
