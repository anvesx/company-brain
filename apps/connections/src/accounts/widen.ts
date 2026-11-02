import type { Kind, Zone } from "./types.js";

export type ZoneCheck = { ok: true } | { ok: false; reason: string };

/** The widening rule: only a tenant admin may make a pat or oauth account company-wide, and only an admin may hold an admin-token. */
export function checkZones(a: { credential: Kind; access: Zone; dataZone: Zone; ownerIsAdmin: boolean }): ZoneCheck {
  if (a.ownerIsAdmin) return { ok: true };
  if (a.credential === "admin-token") return { ok: false, reason: "an admin-token account must be owned by a tenant admin" };
  if (a.dataZone === "company") return { ok: false, reason: `a ${a.credential} account cannot have dataZone company unless its owner is a tenant admin` };
  if (a.access === "company") return { ok: false, reason: `a ${a.credential} account cannot have access company unless its owner is a tenant admin` };
  return { ok: true };
}
