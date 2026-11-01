import type { Pointer, Principal } from "@brain/core-types";

export type Verdict = "allow" | "deny" | "unknown";
export type LiveAcl = (tenantId: string, docIds: string[], principal: Principal) => Promise<Map<string, Verdict>>;
/** Injected so tests control time; the service never reads the wall clock itself. */
export type Timer = { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void };
export type LiveCheck = { allowed: Set<string>; denied: number; unverified: number };

export const realTimer: Timer = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as NodeJS.Timeout) };

/** Ask the live source about a batch. Only an explicit "allow" keeps a hit; everything else fails closed. */
export async function liveCheck(verify: LiveAcl, timer: Timer, ms: number, principal: Principal, batch: Pointer[]): Promise<LiveCheck> {
  const ids = batch.map((p) => p.id);
  let handle: unknown;
  let verdicts: unknown;
  try {
    const timeout = new Promise<never>((_, reject) => {
      handle = timer.set(() => reject(new Error("live acl timeout")), ms);
    });
    verdicts = await Promise.race([Promise.resolve().then(() => verify(principal.tenantId, ids, principal)), timeout]);
  } catch {
    verdicts = undefined;
  } finally {
    if (handle !== undefined) timer.clear(handle);
  }
  const result: LiveCheck = { allowed: new Set(), denied: 0, unverified: 0 };
  for (const id of ids) {
    const verdict = verdicts instanceof Map ? verdicts.get(id) : undefined;
    if (verdict === "allow") result.allowed.add(id);
    else if (verdict === "deny") result.denied++;
    else result.unverified++;
  }
  return result;
}
