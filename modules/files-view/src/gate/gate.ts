import { createPostgresGraphStore } from "@anvesx/graph-store";
import { type Gate, openGate, type Recheck, type RecheckLimits, type Who } from "@anvesx/visibility/gate";
import type pg from "pg";
import { migrate } from "../db/migrate.js";

/** One gate per request: it decides for one viewer and remembers its answers only for that request. */
/** A gate that also reports its live source rechecks, and tells a clean "source says no" from every other way of being hidden. */
export type CountedGate = Gate & {
  rechecks: () => number;
  /** True only when graph rules (tenant, zone, ACL) allow this viewer the id and the source's recheck answers a clean "no". */
  removed: (id: string) => Promise<boolean>;
};
export type GateFactory = (who: Who) => CountedGate;

// A whole page is rechecked at once (the library default of 10 would hide the rest), so the budget is sized to a page.
const LIMITS: RecheckLimits = { perCheckMs: 800, totalMs: 4000, top: 2000 };

/**
 * The production gate: graph-store on `pool` for tenant, zone and ACL, and `recheck` asking the source whether the viewer
 * can still read each file. Creates the graph tables if missing and adds this module's read indexes.
 * Without a `recheck` the library fails closed and hides everything, so it is required.
 */
export async function pgGate(pool: pg.Pool, opts: { recheck: Recheck; limits?: Partial<RecheckLimits> }): Promise<GateFactory> {
  const store = await createPostgresGraphStore({ pool });
  await migrate(pool);
  const limits = { ...LIMITS, ...opts.limits };
  return (who) => {
    const asked = new Map<string, Promise<boolean>>(); // one live recheck per distinct file id per request, whoever asks
    const once: Recheck = (doc, caller) => {
      const known = asked.get(doc.id);
      if (known) return known;
      const answer = Promise.resolve().then(() => opts.recheck(doc, caller));
      asked.set(doc.id, answer);
      return answer;
    };
    const removed = async (id: string): Promise<boolean> => {
      const hit = (await openGate(store, who, { recheck: async () => true, limits }).approve([id])).get(id);
      if (!hit) return false;
      const stop = new Promise<boolean>((ok) => setTimeout(() => ok(true), limits.perCheckMs).unref());
      return (await Promise.race([once(hit.doc, { tenant: who.tenant, user: who.user }).catch(() => true), stop])) === false;
    };
    return Object.assign(openGate(store, who, { recheck: once, limits }), { rechecks: () => asked.size, removed });
  };
}
