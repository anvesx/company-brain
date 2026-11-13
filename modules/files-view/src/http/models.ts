import type { ClusterPath } from "../cluster/paths.js";
import type { ClusterInfo, TreeNode } from "../cluster/tree.js";
import type { FilePage, FileRow } from "../gate/visible.js";
import { type ClusterNode, type ClusterType, type FilesPage, type FilesQuery, type FileRow as Row, styleHashes } from "../ui/index.js";

/** Strict policy: no script at all, only the two inline sheets (by hash), nothing framed, forms post to this origin. */
export const CSP = `default-src 'none'; style-src ${styleHashes().join(" ")}; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`;

/** Headers on every response, errors included. */
export const secure = (set: (name: string, value: string) => void): void => {
  for (const [k, v] of Object.entries({
    "content-security-policy": CSP,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  }))
    set(k, v);
};

const path = (p: ClusterPath) => ({ type: p.type as ClusterType, why: p.why, segments: p.chain.map((c) => ({ id: c.id, name: c.title })) });

/** A gate-approved file as the screens show it. `readers` is passed on only when the gate set it (owner or admin). */
export const toRow = (r: FileRow): Row => {
  const [owner, folder] = [r.props["owner"] ?? "", r.props["folder"]];
  return {
    id: r.id,
    title: r.title,
    source: r.source,
    owner,
    mime: r.props["mime"] ?? "",
    size: Number(r.props["size"] ?? Number.NaN),
    modified: r.props["modified"] ?? "",
    ...(folder && { folder }),
    clusters: r.paths.map(path),
  };
};

/** Empty file shown behind the removed page: no metadata at all. */
export const GONE: Row = { id: "", title: "", source: "", owner: "", mime: "", size: 0, modified: "", clusters: [] };

export const toQuery = (p: Record<string, string>): FilesQuery => ({
  q: p["q"],
  source: p["source"],
  mime: p["mime"],
  owner: p["owner"],
  cluster: p["cluster"],
  from: p["from"],
  to: p["to"],
  sort: p["sort"] as FilesQuery["sort"],
  dir: p["dir"] as FilesQuery["dir"],
  cursor: undefined,
  limit: p["limit"],
});

/** Filter choices come from the rows on this page plus the current selection, so nothing outside the gate is ever listed. */
export function toPage(page: FilePage, p: Record<string, string>): FilesPage {
  const rows = page.rows.map(toRow);
  const pick = (key: "source" | "mime"): string[] => [...new Set([...rows.map((r) => r[key]), ...(p[key] ? [p[key]] : [])])].sort();
  return { rows, nextCursor: page.next, query: toQuery(p), sources: pick("source"), mimes: pick("mime") };
}

export const toNode = (c: ClusterInfo | TreeNode): ClusterNode => ({
  id: c.id,
  name: c.title,
  type: c.type as ClusterType,
  why: c.why,
  count: c.count,
  children: "children" in c ? c.children.map(toNode) : [],
});
