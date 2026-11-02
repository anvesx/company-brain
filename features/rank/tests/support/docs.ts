import fc from "fast-check";
import { type Doc, RankIndex } from "../../src/index.js";
import { NOW } from "./oracle.js";

export const doc = (id: string, over: Partial<Doc> = {}): Doc => ({
  id,
  title: "",
  path: `/${id}`,
  body: "",
  principals: ["company"],
  mtimeMs: NOW,
  links: [],
  ...over,
});

export const open = (): RankIndex => RankIndex.open(":memory:", { now: () => NOW });

export const PRINCIPALS = ["u:ana", "u:bo", "t:eng", "t:ops", "company"];
const WORDS = ["alpha", "beta", "gamma", "deploy", "payroll", "naïve", "日本語", "Привет", "x"];
const text = fc.array(fc.constantFrom(...WORDS), { maxLength: 6 }).map((w) => w.join(" "));

export const docArb: fc.Arbitrary<Doc> = fc.record({
  id: fc.constantFrom("d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"),
  title: text,
  path: fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 3 }).map((w) => `/${w.join("/")}`),
  body: text,
  principals: fc.subarray(PRINCIPALS, { maxLength: 3 }),
  mtimeMs: fc.integer({ min: 0, max: 4 }).map((d) => NOW - d * 86_400_000 * 30),
  links: fc.subarray(["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"], { maxLength: 3 }),
});

export const askerArb = fc.subarray(PRINCIPALS, { minLength: 1 });
export const queryArb = fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 3 }).map((w) => w.join(" "));
