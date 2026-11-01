import { createHash } from "node:crypto";

/** Stable chunk id: sha256 of "docId:index:text", hex. Same input gives the same id. */
export function chunkId(docId: string, index: number, text: string): string {
  return createHash("sha256").update(`${docId}:${index}:${text}`, "utf8").digest("hex");
}
