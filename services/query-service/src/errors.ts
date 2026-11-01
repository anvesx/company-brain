export type QueryErrorCode = "BACKEND" | "EMBEDDING" | "EMPTY_QUERY" | "LIMIT" | "PRINCIPAL";

export class QueryError extends Error {
  readonly code: QueryErrorCode;

  constructor(code: QueryErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "QueryError";
    this.code = code;
  }
}
