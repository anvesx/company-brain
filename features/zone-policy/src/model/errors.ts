export type PromotionErrorCode = "NO_CONSENT" | "NOT_OUTWARD" | "NOT_OWNER" | "NO_COMMON_ZONE";

/** Thrown by promote and derive. The code says which rule failed. */
export class PromotionError extends Error {
  readonly code: PromotionErrorCode;

  constructor(code: PromotionErrorCode, message: string) {
    super(message);
    this.name = "PromotionError";
    this.code = code;
  }
}
