import { createHash } from "node:crypto";
import type { Pointer } from "@brain/core-types";
import { type Content, IndexServiceError } from "../types.js";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/**
 * Check caller-supplied text against the pointer and return it. The claimed hash must equal the pointer's, and
 * the text must really hash to it, so a stale or wrong body can never be indexed under the pointer.
 */
export function verifyContent(pointer: Pointer, content: Content): string {
  if (typeof content?.text !== "string" || typeof content.contentHash !== "string") throw new IndexServiceError("INVALID_EVENT");
  if (content.contentHash !== pointer.contentHash || sha256(content.text) !== pointer.contentHash) throw new IndexServiceError("HASH_MISMATCH");
  return content.text;
}
