import type { SQLInputValue } from "node:sqlite";
import { SearchError } from "../errors.js";

export function sqlParams(values: unknown[]): SQLInputValue[] {
  if (!Array.isArray(values)) throw new SearchError("ACL");
  const valid = values.every((value) =>
    value === null
    || ["string", "number", "bigint"].includes(typeof value)
    || value instanceof Uint8Array
  );
  if (!valid) throw new SearchError("ACL");
  return values as SQLInputValue[];
}
