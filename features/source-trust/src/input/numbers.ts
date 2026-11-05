import { badInput } from "../errors.js";
import { PRIORS } from "../score/weight.js";

const MAX_VALUE_BYTES = 4096;
const encoder = new TextEncoder();

/** A plain object, not null and not an array; anything else is BAD_INPUT on `field`. */
export const asRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw badInput(field, "must be an object");
  return value as Record<string, unknown>;
};

/** Spec rule 12: id, source and item must be non-empty strings. */
export const requireText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value === "") throw badInput(field, "must be a non-empty string");
  return value;
};

/** Spec rule 12: a value is a non-empty string of at most 4096 UTF-8 bytes (é is 2 bytes). */
export const requireValue = (value: unknown, field: string): string => {
  const text = requireText(value, field);
  if (encoder.encode(text).length > MAX_VALUE_BYTES) throw badInput(field, `over ${MAX_VALUE_BYTES} UTF-8 bytes`);
  return text;
};

/** Spec rule 12: at and now are finite non-negative integers (isInteger is false for NaN, Infinity, 1.5). */
export const requireTime = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw badInput(field, "must be a finite non-negative integer");
  return value;
};

const optional = (value: unknown, field: string, ok: (v: number) => boolean, reason: string): void => {
  if (value !== undefined && (typeof value !== "number" || !ok(value))) throw badInput(field, reason);
};

/** Spec rule 12, options rows: now, priors in [0.01, 0.99], minClaims, maxRounds, epsilon, halfLifeMs. */
export const checkOptions = (raw: unknown): void => {
  const options = asRecord(raw, "options");
  requireTime(options["now"], "options.now");
  if (options["priors"] !== undefined) {
    for (const [name, prior] of Object.entries(asRecord(options["priors"], "options.priors"))) {
      const field = `options.priors.${name}`;
      if (!Object.hasOwn(PRIORS, name)) throw badInput(field, "is not a source class");
      optional(prior, field, (p) => p >= 0.01 && p <= 0.99, "must be a number in [0.01, 0.99]");
    }
  }
  const positiveInt = (v: number) => Number.isInteger(v) && v > 0;
  const positive = (v: number) => Number.isFinite(v) && v > 0;
  optional(options["minClaims"], "options.minClaims", positiveInt, "must be a positive integer");
  optional(options["maxRounds"], "options.maxRounds", positiveInt, "must be a positive integer");
  optional(options["epsilon"], "options.epsilon", positive, "must be a positive finite number");
  optional(options["halfLifeMs"], "options.halfLifeMs", positive, "must be a positive finite number");
};
