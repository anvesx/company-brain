export type RetrievalErrorCode = "AUDIT" | "CONFIG";

/** AUDIT = the audit write failed, so the search was refused (original error on `cause`). CONFIG = a required dependency is missing. */
export class RetrievalError extends Error {
  readonly code: RetrievalErrorCode;
  constructor(code: RetrievalErrorCode, message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = "RetrievalError";
    this.code = code;
  }
}
