import type { Auth } from "../auth/options.js";
import type { ResolvedConfig } from "../config.js";
import { checkOrigin } from "../guard/origin.js";
import { createCsrf } from "../port.js";
import { signInView, signUpView } from "./views/auth.js";

export interface Deps {
  auth: Auth;
  cfg: ResolvedConfig;
  /** Runs a request through the guarded API routes (origin check, lockout, validation) without a network hop. */
  call: (req: Request) => Promise<Response>;
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

/** Calls the JSON API as the browser's own session: same cookie, and the Origin a real form post would carry. */
export const api = (d: Deps, req: Request, path: string, body: unknown): Promise<Response> =>
  d.call(
    new Request(`${d.cfg.baseUrl}/api/auth/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(d.cfg.baseUrl).origin,
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
    }),
  );

/** Reads a posted form after the Origin check. A failed check returns the 403 to send. */
export const readForm = async (d: Deps, req: Request): Promise<Record<string, string> | Response> =>
  checkOrigin(req, d.cfg.baseUrl) ?? Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));

/** True when the form's csrf field belongs to the caller's session. */
export const csrfOk = (d: Deps, req: Request, form: Record<string, string>): Promise<boolean> =>
  createCsrf(d.auth, d.cfg).verify(req.headers, form["csrf"] ?? "");

const MESSAGES: Record<number, string> = { 401: "The email or password is wrong.", 429: "Too many attempts. Wait a few minutes and try again." };

/** Sign up or sign in. Success goes on to the OAuth request being continued, or to the connections page. */
export const authenticate = async (d: Deps, req: Request, mode: "sign-up" | "sign-in"): Promise<Response> => {
  const form = await readForm(d, req);
  if (form instanceof Response) return form;
  const query = form["oauth_query"] ?? "";
  const body =
    mode === "sign-up" ? { name: form["name"], email: form["email"], password: form["password"] } : { email: form["email"], password: form["password"] };
  const res = await api(d, req, `${mode}/email`, body);
  if (res.ok) return redirect(query ? `/api/auth/oauth2/authorize?${query}` : "/connections", res);
  const said = (await res.json().catch(() => ({}))) as { message?: string };
  const error = MESSAGES[res.status] ?? said.message ?? "Something went wrong. Try again.";
  return html((mode === "sign-up" ? signUpView : signInView)({ query, error }), res.status);
};
