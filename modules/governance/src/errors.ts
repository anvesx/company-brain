export type GovernanceErrorCode = "AUDIT";

/** AUDIT = the audit service failed, so the operation was refused. The original error is on `cause`. */
export class GovernanceError extends Error {
  readonly code: GovernanceErrorCode;
  constructor(code: GovernanceErrorCode, message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = "GovernanceError";
    this.code = code;
  }
}
