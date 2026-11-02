import type { Doc } from "@anvesx/rank";
import { canSee, type Principal, type Zone } from "@anvesx/zone-policy";
import type { Gate } from "./reindex.js";

/**
 * A gate that keeps a reader on a document only when its ACL names them and zone-policy lets them see
 * the document's zone. A reader is `user:<id>` (a known viewer) or `team:<id>` (a team, seen as a member
 * with no user). The zone is part of the gate's tag, so a zone change reindexes an unedited document.
 */
export function zoneGate(zoneOf: (path: string) => Zone, viewers: Principal[]): Gate {
  const gate = (doc: Doc): Doc => {
    const zone = zoneOf(doc.path);
    const seen = new Set(viewers.filter((v) => canSee(zone, v)).map((v) => `user:${v.user}`));
    const keep = (p: string) => (p.startsWith("team:") ? canSee(zone, { user: "", teams: [p.slice(5)] }) : seen.has(p));
    return { ...doc, principals: doc.principals.filter(keep) };
  };
  return Object.assign(gate, { tag: (path: string) => JSON.stringify(zoneOf(path)) });
}
