import type { Auth } from "../auth/options.js";
import type { ResolvedConfig } from "../config.js";
import { IdentityError, InstallRenderError } from "../errors.js";
import { checkOrigin } from "../guard/origin.js";
import { createCsrf } from "../port.js";
import { esc, page } from "./layout.js";

export interface Deps {
  auth: Auth;
  cfg: ResolvedConfig;
  /** Runs a request through the guarded API routes (origin check, lockout, validation) without a network hop. `env` is the socket behind the browser's request, so address limits see the real address. */
  call: (req: Request, env?: unknown) => Promise<Response>;
}

/** HTML with the headers that stop other sites framing the page (clickjacking on the consent button). */
export const html = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-frame-options": "DENY", "content-security-policy": "frame-ancestors 'none'" },
  });

/** A 302 that also hands the browser any cookies the API call set (sign-in sets one, sign-out clears it). */
export const redirect = (to: string, from?: Response): Response => {
  const headers = new Headers({ location: to });
  for (const cookie of from?.headers.getSetCookie() ?? []) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
};

/** Calls the JSON API as the browser's own session: same cookie, the proxy's address header, and the Origin a real form post would carry. */
export const api = (d: Deps, req: Request, path: string, body: unknown, env?: unknown): Promise<Response> =>
  d.call(
    new Request(`${d.cfg.baseUrl}/api/auth/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(d.cfg.baseUrl).origin,
        cookie: req.headers.get("cookie") ?? "",
        "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify(body),
    }),
    env,
  );

/** The error page for a refused or stale form. A broken install file is our fault, so it is a 500 that names the client. */
export const oops = (error: unknown, status = 400): Response => {
  const known = error instanceof IdentityError || error instanceof InstallRenderError;
  const code = error instanceof InstallRenderError ? 500 : status;
  return html(page("Cannot continue", `<p role="alert">${known ? esc(error.message) : "Something went wrong."}</p>`), code);
};

const FORM_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data"];

/** Reads a posted form after the Origin check. A failed check returns the 403; a body that is not a form returns a 400. */
export const readForm = async (d: Deps, req: Request): Promise<Record<string, string> | Response> => {
  const refused = checkOrigin(req, d.cfg.baseUrl);
  if (refused) return refused;
  const notForm = () => oops(new IdentityError("BAD_INPUT", "send this as a form post", "body"));
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!FORM_TYPES.some((allowed) => type.startsWith(allowed))) return notForm();
  try {
    return Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));
  } catch {
    // A body that claims to be a form but is cut off or malformed makes formData() throw.
    return notForm();
  }
};

/** True when the form's csrf field belongs to the caller's session. */
export const csrfOk = (d: Deps, req: Request, form: Record<string, string>): Promise<boolean> =>
  createCsrf(d.auth, d.cfg).verify(req.headers, form["csrf"] ?? "");
