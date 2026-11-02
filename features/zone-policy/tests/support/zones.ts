import type { Zone } from "../../src/index.js";

export const personal = (owner: string): Zone => ({ kind: "personal", owner });
export const team = (name: string): Zone => ({ kind: "team", team: name });
export const company: Zone = { kind: "company" };

/** Returns the value a function throws, or undefined when it does not throw. */
export const captureError = (fn: () => unknown): unknown => {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error;
  }
};

/** Result of derive or promote as a tagged value, so property tests can compare throws too. */
export type Outcome = { ok: Zone } | { code: string } | { thrown: string };

export const outcomeOf = (fn: () => Zone, codeOf: (e: unknown) => string | undefined): Outcome => {
  try {
    return { ok: fn() };
  } catch (error) {
    const code = codeOf(error);
    return code === undefined ? { thrown: String(error) } : { code };
  }
};
