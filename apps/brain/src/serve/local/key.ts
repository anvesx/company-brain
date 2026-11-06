import { hkdfSync } from "node:crypto";

/**
 * The key that signs graph-view "Load more" cursors, derived from the auth secret. Every instance given the same
 * BRAIN_AUTH_SECRET derives the same key, so any instance accepts a cursor another one issued. The label keeps it
 * apart from the key that signs session cookies, so neither key can stand in for the other.
 */
export const cursorKeyFrom = (secret: string): Uint8Array => new Uint8Array(hkdfSync("sha256", secret, "", "graph-view cursor v1", 32));
