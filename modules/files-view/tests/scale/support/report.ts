import { writeSync } from "node:fs";

/** Straight to stdout: vitest hides console output of passing tests, and these numbers are the evidence. */
export const out = (s: string): void => void writeSync(1, `${s}\n`);
export const pct = (xs: number[], q: number): number => xs[Math.min(xs.length - 1, Math.ceil(q * xs.length) - 1)] as number;
export type Plan = { "Node Type": string; "Relation Name"?: string; "Index Name"?: string; "Actual Rows"?: number; "Actual Loops"?: number; Plans?: Plan[] };
export const walk = (p: Plan): Plan[] => [p, ...(p.Plans ?? []).flatMap(walk)];

/** Runs `fn` n times in sequence (after 5 warm-ups) and returns the sorted wall times in ms. */
export async function time(n: number, fn: (i: number) => Promise<unknown>): Promise<number[]> {
  for (let i = 0; i < 5; i++) await fn(i);
  const ms: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fn(i + 5);
    ms.push(performance.now() - t);
  }
  return ms.sort((a, b) => a - b);
}
export const row = (name: string, ms: number[], extra = ""): string =>
  [name, pct(ms, 0.5), pct(ms, 0.95), pct(ms, 0.99)].map((v) => (typeof v === "number" ? v.toFixed(1) : v)).join(" | ") + (extra ? ` | ${extra}` : "");
