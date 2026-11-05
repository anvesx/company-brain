/** The only error code this package raises. */
export type TrustErrorCode = "BAD_INPUT";

/**
 * Raised for every rejected input (spec rule 12). `field` is a path from the call arguments,
 * for example "claims[0].value", "sources[1].id", "copies[0].share" or "options.priors.chat".
 * The message starts with the same path so a log line alone names the culprit.
 */
export class TrustError extends Error {
  readonly code: TrustErrorCode = "BAD_INPUT";
  readonly field: string;

  constructor(field: string, reason: string) {
    super(`${field}: ${reason}`);
    this.name = "TrustError";
    this.field = field;
  }
}

/** Build a BAD_INPUT error for `field`; callers throw the result. */
export const badInput = (field: string, reason: string): TrustError => new TrustError(field, reason);
