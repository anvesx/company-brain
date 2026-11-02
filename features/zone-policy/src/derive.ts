import { PromotionError } from "./model/errors.js";
import { type Membership, ZONE_RANK, type Zone } from "./model/zone.js";

const distinctCount = (values: readonly string[]): number => new Set(values).size;

/**
 * The zone for data derived from all inputs: the audience is the intersection
 * of the input audiences, never wider. Zones are not a chain: personal(u) is
 * inside team(t) only when `isMember(u, t)` proves it. Throws RangeError on an
 * empty list and NO_COMMON_ZONE when owners or teams differ, or when personal
 * and team inputs have no proven membership.
 */
export const derive = (inputs: readonly Zone[], isMember?: Membership): Zone => {
  if (inputs.length === 0) throw new RangeError("derive needs at least one zone");
  const owners = inputs.flatMap((zone) => (zone.kind === "personal" ? [zone.owner] : []));
  const teams = inputs.flatMap((zone) => (zone.kind === "team" ? [zone.team] : []));
  if (distinctCount(owners) > 1 || distinctCount(teams) > 1) {
    throw new PromotionError("NO_COMMON_ZONE", "inputs have no common zone");
  }
  const [owner] = owners;
  const [team] = teams;
  if (owner !== undefined && team !== undefined && isMember?.(owner, team) !== true) {
    throw new PromotionError("NO_COMMON_ZONE", "personal and team inputs need proof the owner is in the team");
  }
  return inputs.reduce((strictest, zone) => (ZONE_RANK[zone.kind] < ZONE_RANK[strictest.kind] ? zone : strictest));
};
