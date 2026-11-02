import type { Doc } from "@anvesx/rank";
import { canSee, type Principal, type Zone } from "@anvesx/zone-policy";
import type { Gate } from "./reindex.js";

/**
 * A gate that keeps a reader on a document only when its ACL names them and zone-policy lets them see
 * the document's zone. Viewers are the known users; a reader is `user:<id>`.
 */
export function zoneGate(zoneOf: (path: string) => Zone, viewers: Principal[]): Gate {
  return (doc: Doc): Doc => {
    const zone = zoneOf(doc.path);
    const seen = viewers.filter((v) => canSee(zone, v)).map((v) => `user:${v.user}`);
    return { ...doc, principals: doc.principals.filter((p) => seen.includes(p)) };
  };
}
