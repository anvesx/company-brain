import { SearchError } from "../errors.js";

export function validText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

export function validateEmbedding(value: unknown, dim: number): asserts value is number[] {
  if (!Array.isArray(value) || value.length !== dim || value.some((n) => !Number.isFinite(n))) throw new SearchError("DIM");
}
