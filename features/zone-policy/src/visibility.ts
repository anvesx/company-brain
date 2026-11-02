import { hasId, type Principal, type Zone } from "./model/zone.js";

/** Whether a principal may see data in a zone. Personal zones are owner-only, even for admins. */
export const canSee = (zone: Zone, principal: Principal): boolean => {
  switch (zone.kind) {
    case "personal":
      return hasId(zone.owner) && principal.user === zone.owner;
    case "team":
      return hasId(zone.team) && principal.teams.includes(zone.team);
    case "company":
      return true;
  }
};
