import { badInput } from "../errors.js";
import { asRecord } from "../input/numbers.js";
import type { LabelledPassage, PassageRef, TrustResult } from "../types.js";

/** Rule 12: a passage is an object with a string source and string item and value when present. */
const checkPassage = (raw: unknown, i: number): void => {
  const row = asRecord(raw, `passages[${i}]`);
  if (typeof row["source"] !== "string") throw badInput(`passages[${i}].source`, "must be a string");
  for (const key of ["item", "value"]) {
    if (row[key] !== undefined && typeof row[key] !== "string") throw badInput(`passages[${i}].${key}`, "must be a string");
  }
};

/** Rule 12: each entry of result.sources / result.items is an object with a string source / item; a source also has a finite accuracy. */
const checkEntries = (row: Record<string, unknown>, list: "sources" | "items", key: "source" | "item"): void => {
  const entries = row[list];
  if (!Array.isArray(entries)) throw badInput(`result.${list}`, "must be an array");
  // Index loop, not forEach: forEach skips holes in a sparse array, and a hole must be rejected.
  for (let i = 0; i < entries.length; i++) {
    const entry = asRecord(entries[i], `result.${list}[${i}]`);
    if (typeof entry[key] !== "string") throw badInput(`result.${list}[${i}].${key}`, "must be a string");
    if (list === "sources" && !Number.isFinite(entry["accuracy"])) throw badInput(`result.sources[${i}].accuracy`, "must be a finite number");
  }
};

const checkResult = (raw: unknown): void => {
  const row = asRecord(raw, "result");
  checkEntries(row, "sources", "source");
  checkEntries(row, "items", "item");
  // A winner value is a string, or null for no winner (Resolution.value); anything else is bad input.
  (row["items"] as Array<Record<string, unknown>>).forEach((entry, i) => {
    if (entry["value"] !== null && typeof entry["value"] !== "string") throw badInput(`result.items[${i}].value`, "must be a string or null");
  });
};

/**
 * Spec rules 11 and 18 (CAG Fig 4): label every passage, drop none. trust is the source accuracy,
 * or 0 for a source the result does not know. group is best (matches the winner), other (known
 * item, any other value) or unresolved (no item, unknown item, a null winner, or unknown source).
 * Rule 12: bad passages or result raise BAD_INPUT naming "passages", "passages[i]", "passages[i].source",
 * "passages[i].item", "passages[i].value", "result", "result.sources", "result.sources[i]", "result.sources[i].source", "result.sources[i].accuracy",
 * "result.items", "result.items[i]", "result.items[i].item" or "result.items[i].value".
 */
export const labelPassages = <T extends PassageRef>(passages: T[], result: TrustResult): Array<LabelledPassage<T>> => {
  if (!Array.isArray(passages)) throw badInput("passages", "must be an array");
  for (let i = 0; i < passages.length; i++) checkPassage(passages[i], i);
  checkResult(result);
  const accuracy = new Map(result.sources.map((s) => [s.source, s.accuracy]));
  const winners = new Map(result.items.map((i) => [i.item, i.value]));
  return passages.map((p) => {
    const trust = accuracy.get(p.source);
    const winner = p.item === undefined ? undefined : winners.get(p.item);
    if (trust === undefined || winner === undefined || winner === null) return { ...p, trust: trust ?? 0, group: "unresolved" };
    return { ...p, trust, group: p.value?.normalize("NFC") === winner ? "best" : "other" };
  });
};
