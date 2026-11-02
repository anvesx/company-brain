const WORD = /[\p{L}\p{N}\p{M}]+/gu;
const MAX_QUERY_CHARS = 10_000;
const MAX_TERMS = 32;

/** NFC, lower case, runs of letters, digits and combining marks. */
export const tokenize = (text: string): string[] => text.normalize("NFC").toLowerCase().match(WORD) ?? [];

/**
 * Tokens reach FTS5 hex-encoded (UTF-8), so the `ascii` tokenizer sees only [0-9a-f]. FTS5's own case
 * folding and splitting cannot disagree with ours, and no user text is ever FTS5 query syntax.
 */
const encode = (token: string): string => Buffer.from(token, "utf8").toString("hex");

export const encodeTokens = (tokens: readonly string[]): string => tokens.map(encode).join(" ");

export const indexText = (text: string): string => encodeTokens(tokenize(text));

/** Distinct encoded terms of a query, first-seen order. Reads at most 10000 characters and keeps 32 terms. */
export const queryTerms = (query: string): string[] => [...new Set(tokenize(query.slice(0, MAX_QUERY_CHARS)))].slice(0, MAX_TERMS).map(encode);
