const part = (s: string): string => encodeURIComponent(s).replaceAll(".", "%2E");

/**
 * The token file's top-level key for one caller: `<tenant>:<user>`, each part percent-encoded.
 * Dots are encoded too, so `..` cannot survive, and `:` `/` `\` never appear inside a part.
 * `apps/connections/src/tokens/user-key.ts` writes the file with the same function.
 */
export const userKey = (tenant: string, user: string): string => `${part(tenant)}:${part(user)}`;
