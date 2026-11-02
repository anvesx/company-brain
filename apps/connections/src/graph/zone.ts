import type { ListedDoc } from "@brain/connector-kit";
import type { Zone } from "../accounts/types.js";

/** A `@brain/core-types` zone: personal, team or company. */
export type CoreZone = ListedDoc["zone"];

/**
 * Account zone to graph zone. `company` stays company. `private` and `personal` both become `personal`
 * (owner only): the agents an owner runs act as the owner, so the graph has no wider reader to give `personal`.
 * No account zone maps to `team` yet.
 */
export const coreZone = (z: Zone): CoreZone => (z === "company" ? "company" : "personal");

/** Whether documents of this account zone keep the source's own readers. Anything narrower than company is written owner-only. */
export const keepsSourceAcl = (z: Zone): boolean => coreZone(z) === "company";
