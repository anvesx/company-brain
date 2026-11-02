import type { Principal, Zone } from "./model/zone.js";

/** Whether a principal may see data in a zone. Personal zones are owner-only, even for admins. */
export const canSee = (zone: Zone, principal: Principal): boolean => {
  switch (zone.kind) {
    case "personal":
      return principal.user === zone.owner;
    case "team":
      return principal.teams.includes(zone.team);
    case "company":
      return true;
  }
};
