import { SyncError } from "./types.js";

// Newest claim per (tenant, connector). In memory: it orders the runs of one process, however many store handles they use.
const newest = new Map<string, number>();

/** Claims the newest run of this connector in this tenant. The returned check throws SUPERSEDED once a later run has claimed it. */
export const claim = (tenant: string, connector: string): (() => void) => {
  const key = `${tenant}\0${connector}`;
  // Stryker disable next-line ArithmeticOperator: equivalent, counting down gives each claim a distinct number too
  const mine = (newest.get(key) ?? 0) + 1;
  newest.set(key, mine);
  return () => {
    if (newest.get(key) !== mine) throw new SyncError("SUPERSEDED", `sync of ${connector} was superseded by a newer run`);
  };
};
