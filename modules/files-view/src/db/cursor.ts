/** The sort keys of the last row of a page plus its id, so the next page continues strictly after it. */
export type Cursor = { o: string; k: string; i: string };

export class BadInput extends Error {}

/** Opaque cursor: base64url of JSON. `o` ties it to one sort order, so a cursor cannot be replayed under another. */
export const encode = (c: Cursor): string => Buffer.from(JSON.stringify(c)).toString("base64url");

export function decode(raw: string, order: string): Cursor {
  const fail = () => new BadInput("bad cursor");
  if (raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw fail();
  let v: unknown;
  try {
    v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw fail();
  }
  const c = v as Cursor;
  if (typeof c !== "object" || c === null || c.o !== order || typeof c.k !== "string" || typeof c.i !== "string" || c.i === "") throw fail();
  if (/\0/.test(c.k + c.i) || (/^(size|modified):/.test(order) && !/^-?[0-9]{1,18}$/.test(c.k))) throw fail();
  return c;
}
