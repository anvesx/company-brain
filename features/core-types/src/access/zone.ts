import { z } from "zod";

/** Trust zones, lowest to highest. Derived data takes the most restricted (lowest-index) input zone. */
export const ZONES = ["personal", "team", "company"] as const;
export const ZoneSchema = z.enum(ZONES);
export type Zone = z.infer<typeof ZoneSchema>;

export const mostRestrictedZone = (zones: readonly Zone[]): Zone => {
  if (zones.length === 0) throw new RangeError("mostRestrictedZone needs at least one zone");
  return zones.reduce((a, b) => (ZONES.indexOf(b) < ZONES.indexOf(a) ? b : a));
};
