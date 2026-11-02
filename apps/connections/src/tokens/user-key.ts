const part = (s: string): string => encodeURIComponent(s).replaceAll(".", "%2E");

/**
 * The token file's top-level key for one caller: `<tenant>:<user>`, each part percent-encoded.
 * Dots are encoded too, so `..` cannot survive, and `:` `/` `\` never appear inside a part.
 * `apps/brain/src/cli/user-key.ts` holds the same function; `tests/tokens/source-keys.test.ts` checks they agree.
 */
export const userKey = (tenant: string, user: string): string => `${part(tenant)}:${part(user)}`;
