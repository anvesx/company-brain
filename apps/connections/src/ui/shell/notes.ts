import type { Note } from "./status.js";

const DONE: Record<string, string> = {
  synced: "Sync finished.",
  disconnected: "Disconnected. The saved sign-in is gone.",
  saved: "Repository saved.",
  connected: "Connected. Open the account and press Sync now to read it.",
};

/** The note a redirect carries: a fixed sentence for `notice`, the server's own words for `error` and `oauth_error`. */
export const noteOf = (q: Record<string, string>): Note | undefined => {
  const err = q.error ?? (q.oauth_error && `The provider did not connect: ${q.oauth_error}`);
  if (err) return { kind: "bad", text: err.slice(0, 200) };
  const ok = DONE[q.notice ?? (q.connected ? "connected" : "")];
  return ok ? { kind: "ok", text: ok } : undefined;
};
