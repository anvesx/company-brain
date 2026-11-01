export type ChunkErrorCode = "BAD_OPTIONS" | "OFFSET_LOST";

/** Typed failure of the chunker. Callers branch on `code`, never on the message. */
export class ChunkError extends Error {
  readonly code: ChunkErrorCode;

  constructor(code: ChunkErrorCode, message: string) {
    super(message);
    this.name = "ChunkError";
    this.code = code;
  }
}
