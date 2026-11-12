import type { Doc } from "./live.js";
export type Viewer = {
  tenant: string;
  user: string;
  aliases: string[];
  role: "member" | "admin";
  zones: string[];
};

export type Acl = { at: number; allow: string[] | null };
export type Target = { tenant: string; id: string; owner: string; zone: string; acl: Acl[] };
export type Decision = { visible: false } | { visible: true; readers?: string[] };

const denied: Decision = { visible: false };

/**
 * The only permission decision. Historical content never revives historical access:
 * `opts.asOf` is deliberately ignored and the newest ACL is always authoritative.
 */
export function decide(viewer: Viewer, target: Target, _opts?: { asOf?: number }): Decision {
  if (viewer.tenant === "" || viewer.tenant !== target.tenant || viewer.user === "") return denied;
  if (target.zone === "" || !new Set(viewer.zones).has(target.zone)) return denied;

  const current = target.acl.at(-1)?.allow;
  if (current === null || current === undefined) return denied;

  const principals = new Set([viewer.user, ...viewer.aliases].filter((name) => name !== ""));
  if (!current.some((reader) => principals.has(reader))) return denied;

  if (viewer.role === "admin" || viewer.user === target.owner) {
    return { visible: true, readers: [...new Set(current)] };
  }
  return { visible: true };
}

type Edge = { from: string; to: string };
type Many<T> = T[] | Promise<T[]>;
/** What the gate reads: always the current graph. It never takes `asOf`, so a past view cannot revive past access. */
export interface PermStore {
  nodesOf(tenant: string, ids: string[]): Many<Doc>;
  edgesOf(tenant: string, ids: string[], o: { dir: "out" | "in"; kinds: ("member-of" | "can-read")[] }): Many<Edge>;
}
export type Who = { tenant: string; user: string; aliases?: string[] | undefined; role?: "member" | "admin" };
/** `readers` is set only when the viewer owns the document or is an admin (leak 4). */
export type Approved = { doc: Doc; readers?: string[] | undefined };
export interface Gate {
  /** The viewer, their aliases and every team any of those belongs to. */
  principals(): Promise<string[]>;
  /** The documents among `ids` (or all the principals can read, when omitted) that pass tenant, zone, ACL and the live check. */
  approve(ids?: string[]): Promise<Map<string, Approved>>;
}
