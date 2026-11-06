import type { Caller } from "@anvesx/identity";

/** Identity's guard: answers 401 with the challenge unless the request carries a valid credential. */
export type Protect = (handler: (req: Request, caller: Caller) => Promise<Response>) => (req: Request) => Promise<Response>;

/**
 * Narrows identity's guard to bearer tokens only. Identity falls back to the browser session cookie when
 * there is no Authorization header; a cookie is sent by any page the user visits, so `/mcp` must never
 * accept it. The guard only reads headers, so it is shown a copy of the request with no cookie: a
 * cookie-only call then fails with the same 401 and challenge as a call with no credential.
 */
export const bearerOnly =
  (protect: Protect): Protect =>
  (handler) =>
  (req) => {
    const headers = new Headers(req.headers);
    headers.delete("cookie");
    return protect(handler)(new Request(req.url, { method: req.method, headers }));
  };
