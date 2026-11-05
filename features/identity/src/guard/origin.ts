/** Paths a non-browser client calls without a cookie, so they need no Origin header. */
const OPEN_PATHS = new Set(["/api/auth/oauth2/token", "/api/auth/oauth2/register", "/api/auth/oauth2/introspect", "/api/auth/oauth2/revoke"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for writes. A write from another origin is refused, and so is a cookie-carrying write with no Origin at all.
 * Returns a 403 response to send, or null when the request may go on.
 */
export const checkOrigin = (req: Request, baseUrl: string): Response | null => {
  if (SAFE_METHODS.has(req.method) || OPEN_PATHS.has(new URL(req.url).pathname)) return null;
  const origin = req.headers.get("origin");
  const allowed = origin === null ? !req.headers.has("cookie") : origin === new URL(baseUrl).origin;
  return allowed ? null : Response.json({ error: "forbidden_origin" }, { status: 403 });
};
