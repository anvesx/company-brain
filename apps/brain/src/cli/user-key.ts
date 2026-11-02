/** Percent-encodes one part. A lone surrogate (which `encodeURIComponent` rejects) becomes `%U` plus its code unit in hex; a real `%` is `%25`, so it cannot collide. */
const part = (s: string): string =>
  s
    .split(/(\p{Surrogate})/u)
    .map((x, i) => (i % 2 ? `%U${x.charCodeAt(0).toString(16).toUpperCase()}` : encodeURIComponent(x).replaceAll(".", "%2E")))
    .join("");

/**
 * The token file's top-level key for one caller: `<tenant>:<user>`, each part percent-encoded.
 * Dots are encoded too, so `..` cannot survive, and `:` `/` `\` never appear inside a part.
 * `apps/connections/src/tokens/user-key.ts` writes the file with the same function.
 */
export const userKey = (tenant: string, user: string): string => `${part(tenant)}:${part(user)}`;
