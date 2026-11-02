import { PromotionError } from "./model/errors.js";
import { ZONE_RANK, type Zone } from "./model/zone.js";

const distinctCount = (values: readonly string[]): number => new Set(values).size;

/**
 * The zone for data derived from all inputs: the strictest input wins.
 * Throws RangeError on an empty list and NO_COMMON_ZONE when two personal
 * owners or two teams conflict.
 */
export const derive = (inputs: readonly Zone[]): Zone => {
  if (inputs.length === 0) throw new RangeError("derive needs at least one zone");
  const owners = inputs.flatMap((zone) => (zone.kind === "personal" ? [zone.owner] : []));
  const teams = inputs.flatMap((zone) => (zone.kind === "team" ? [zone.team] : []));
  if (distinctCount(owners) > 1 || distinctCount(teams) > 1) {
    throw new PromotionError("NO_COMMON_ZONE", "inputs have no common zone");
  }
  return inputs.reduce((strictest, zone) => (ZONE_RANK[zone.kind] < ZONE_RANK[strictest.kind] ? zone : strictest));
};
