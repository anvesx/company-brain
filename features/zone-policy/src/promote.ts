import { PromotionError } from "./model/errors.js";
import { type Consent, ZONE_RANK, type Zone } from "./model/zone.js";

/**
 * Moves data outward: personal to team to company. Same-zone, lateral and
 * downward moves throw NOT_OUTWARD. Consent is required. For personal data it
 * must come from the owner.
 */
export const promote = (from: Zone, to: Zone, consent: Consent | undefined): Zone => {
  if (ZONE_RANK[to.kind] <= ZONE_RANK[from.kind]) {
    throw new PromotionError("NOT_OUTWARD", `cannot move ${from.kind} data to ${to.kind}`);
  }
  if (consent === undefined || consent.by === "") {
    throw new PromotionError("NO_CONSENT", `promotion to ${to.kind} needs consent`);
  }
  if (from.kind === "personal" && consent.by !== from.owner) {
    throw new PromotionError("NOT_OWNER", "only the owner can consent to promote personal data");
  }
  return to;
};
