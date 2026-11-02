import { GraphError } from "@anvesx/graph-store";
import { SyncError } from "../types.js";
import type { Ctx } from "./document.js";

const bad = (e: unknown): e is Error => (e instanceof GraphError || e instanceof SyncError) && e.code === "BAD_INPUT";

/** Runs the writes of one entry. Bad input is recorded in the report under `label` instead of aborting the run; `onSkip` then runs. */
export const guarded = (c: Ctx, label: string, write: () => void, onSkip: () => void = () => {}): void => {
  try {
    write();
  } catch (e) {
    if (!bad(e)) throw e;
    c.report.skipped.push({ address: label, message: e.message });
    onSkip();
  }
};

/** Fail closed: a skipped document keeps no `can-read` edge from this connector until a later run writes it whole. */
export const revoke = (c: Ctx, doc: string): void => {
  const { store, tenant, connector, now } = c.deps;
  try {
    for (const e of store.neighbors(tenant, doc, { kind: "can-read", dir: "in" })) {
      if (e.source === connector.id) store.removeEdge(e, now());
    }
  } catch (e) {
    if (!bad(e)) throw e;
  }
};
