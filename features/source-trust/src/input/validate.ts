import { badInput } from "../errors.js";
import { PRIORS } from "../score/weight.js";
import { asRecord, checkOptions, requireText, requireTime, requireValue } from "./numbers.js";

/** An array field; `required` lists must exist, optional ones may be undefined. */
const list = (input: Record<string, unknown>, key: string, required: boolean): unknown[] => {
  const value = input[key];
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) throw badInput(key, "must be an array");
  return value;
};

/** Spec rule 12: each source has a unique non-empty id and a known class. Returns the id set. */
const checkSources = (sources: unknown[]): Set<string> => {
  const ids = new Set<string>();
  // Index loop, not forEach: forEach skips holes in a sparse array, and a hole must be rejected.
  for (let i = 0; i < sources.length; i++) {
    const raw = sources[i];
    const row = asRecord(raw, `sources[${i}]`);
    const id = requireText(row["id"], `sources[${i}].id`);
    if (ids.has(id)) throw badInput(`sources[${i}].id`, `duplicate id "${id}"`);
    ids.add(id);
    if (typeof row["class"] !== "string" || !Object.hasOwn(PRIORS, row["class"])) throw badInput(`sources[${i}].class`, "is not a source class");
  }
  return ids;
};

/** Spec rule 12: claims have unique ids, known sources, bounded values and integer times. Returns the item set. */
const checkClaims = (claims: unknown[], sources: Set<string>): Set<string> => {
  const ids = new Set<string>();
  const items = new Set<string>();
  for (let i = 0; i < claims.length; i++) {
    const raw = claims[i];
    const row = asRecord(raw, `claims[${i}]`);
    const id = requireText(row["id"], `claims[${i}].id`);
    if (ids.has(id)) throw badInput(`claims[${i}].id`, `duplicate id "${id}"`);
    ids.add(id);
    if (!sources.has(requireText(row["source"], `claims[${i}].source`))) throw badInput(`claims[${i}].source`, "names an unknown source");
    items.add(requireText(row["item"], `claims[${i}].item`));
    requireValue(row["value"], `claims[${i}].value`);
    requireTime(row["at"], `claims[${i}].at`);
  }
  return items;
};

/** Spec rule 12: a copy edge joins two different known sources with a share in [0, 1]. */
const checkCopies = (copies: unknown[], sources: Set<string>): void => {
  for (let i = 0; i < copies.length; i++) {
    const raw = copies[i];
    const row = asRecord(raw, `copies[${i}]`);
    const copier = requireText(row["copier"], `copies[${i}].copier`);
    const original = requireText(row["original"], `copies[${i}].original`);
    if (!sources.has(copier)) throw badInput(`copies[${i}].copier`, "names an unknown source");
    if (!sources.has(original)) throw badInput(`copies[${i}].original`, "names an unknown source");
    if (copier === original) throw badInput(`copies[${i}].original`, "a source cannot copy itself");
    const share = row["share"];
    if (typeof share !== "number" || !(share >= 0 && share <= 1)) throw badInput(`copies[${i}].share`, "must be a number in [0, 1]");
  }
};

/** Spec rule 12: a correction names a known item, a bounded value and an integer time. */
const checkCorrections = (corrections: unknown[], items: Set<string>): void => {
  for (let i = 0; i < corrections.length; i++) {
    const raw = corrections[i];
    const row = asRecord(raw, `corrections[${i}]`);
    if (!items.has(requireText(row["item"], `corrections[${i}].item`))) throw badInput(`corrections[${i}].item`, "names an unknown item");
    requireValue(row["value"], `corrections[${i}].value`);
    requireTime(row["at"], `corrections[${i}].at`);
  }
};

/** Spec rule 12: validate the whole call before any maths; the first bad field throws BAD_INPUT. */
export const validate = (raw: unknown, options: unknown): void => {
  const input = asRecord(raw, "input");
  const sources = checkSources(list(input, "sources", true));
  const items = checkClaims(list(input, "claims", true), sources);
  checkCopies(list(input, "copies", false), sources);
  checkCorrections(list(input, "corrections", false), items);
  checkOptions(options);
};
