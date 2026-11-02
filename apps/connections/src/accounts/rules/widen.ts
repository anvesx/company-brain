import type { Kind, Zone } from "../types.js";

export type ZoneCheck = { ok: true } | { ok: false; reason: string };

/** The widening rule, plus: a connector with no `canRead` (`liveRecheck: false`) is never company, whoever owns it. Only a tenant admin may make a pat or oauth account company-wide, and only an admin may hold an admin-token. `liveRecheck` is required; a missing or non-boolean value (an untyped caller) is denied outright. */
export function checkZones(a: { credential: Kind; access: Zone; dataZone: Zone; ownerIsAdmin: boolean; liveRecheck: boolean }): ZoneCheck {
  if (typeof a.liveRecheck !== "boolean") return { ok: false, reason: "liveRecheck must be true or false, so this connector cannot be checked" };
  if (a.liveRecheck === false && (a.dataZone === "company" || a.access === "company"))
    return { ok: false, reason: "this connector has no canRead, so it can only be private or personal, never company" };
  if (a.ownerIsAdmin) return { ok: true };
  if (a.credential === "admin-token") return { ok: false, reason: "an admin-token account must be owned by a tenant admin" };
  if (a.dataZone === "company") return { ok: false, reason: `a ${a.credential} account cannot have dataZone company unless its owner is a tenant admin` };
  if (a.access === "company") return { ok: false, reason: `a ${a.credential} account cannot have access company unless its owner is a tenant admin` };
  return { ok: true };
}
