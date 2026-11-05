import { expect } from "vitest";
import { resolveClaims, TrustError } from "../../../src/index.js";

/** A valid call; each row of rule 12 breaks exactly one field of a fresh copy. */
export const validCall = (): { input: Record<string, unknown[]>; options: Record<string, unknown> } => ({
  input: {
    sources: [
      { id: "s1", class: "signed" },
      { id: "s2", class: "chat" },
    ],
    claims: [
      { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
      { id: "c2", source: "s2", item: "x", value: "b", at: 2 },
    ],
    copies: [{ copier: "s2", original: "s1", share: 0.5 }],
    corrections: [{ item: "x", value: "a", at: 3 }],
  },
  options: { now: 10, priors: { chat: 0.5 }, minClaims: 1, maxRounds: 3, epsilon: 1e-6, halfLifeMs: 1000 },
});

type Call = ReturnType<typeof validCall>;
export type Row = [string, (call: Call) => void, string];

/** Set `key` on element `index` of input list `list`. */
export const put =
  (list: string, index: number, key: string, value: unknown) =>
  (call: Call): void => {
    (call.input[list]![index] as Record<string, unknown>)[key] = value;
  };

/** Run the broken call and assert BAD_INPUT naming `field`. */
export const expectBadInput = (breakIt: (call: Call) => void, field: string): void => {
  const call = validCall();
  breakIt(call);
  let caught: unknown;
  try {
    resolveClaims(call.input as never, call.options as never);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(TrustError);
  expect((caught as TrustError).code).toBe("BAD_INPUT");
  expect((caught as TrustError).field).toBe(field);
  // The message is "<field>: <reason>"; the reason must not be empty.
  expect((caught as TrustError).message).toMatch(/^.+?: \S/);
  expect((caught as TrustError).message.startsWith(`${field}: `)).toBe(true);
};
