import type { Note } from "./status.js";

const DONE: Record<string, string> = {
  synced: "Sync finished.",
  disconnected: "Disconnected. The saved sign-in is gone.",
  saved: "Repository saved.",
  cleared: "Repository cleared.",
  connected: "Connected. Open the account and press Sync now to read it.",
};

const BAD: Record<string, string> = {
  input: "That input was not accepted. Check it and try again.",
  forbidden: "Only the account's owner can do that.",
  "not-found": "That account was not found.",
  reconnect: "The provider no longer accepts the saved sign-in. Reconnect the account.",
  source: "The app could not be read just now. Try again later.",
  unavailable: "That app cannot be connected from here.",
  denied: "The provider did not grant access.",
  state: "The sign-in expired or was not started in this browser. Start again.",
  exchange: "The provider would not hand over a token. Try again.",
  zones: "That sharing level is not allowed for this app.",
  failed: "The request failed.",
};

/** The fixed code a `/v1` answer maps to; the page never repeats the server's own words. */
export const codeOf = (status: number): string => ({ 400: "input", 403: "forbidden", 404: "not-found", 409: "reconnect", 502: "source" })[status] ?? "failed";

/** The note a redirect carries. Both `error` and `oauth_error` are looked up in a fixed table, so no query text is ever shown. */
export const noteOf = (q: Record<string, string>): Note | undefined => {
  const bad = q.error ?? q.oauth_error;
  if (bad !== undefined) return { kind: "bad", text: Object.hasOwn(BAD, bad) ? (BAD[bad] as string) : (BAD.failed as string) };
  const ok = Object.hasOwn(DONE, q.notice ?? "") ? DONE[q.notice as string] : q.connected ? DONE.connected : undefined;
  return ok ? { kind: "ok", text: ok } : undefined;
};
