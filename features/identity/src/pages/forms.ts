import type { Hono } from "hono";
import { IdentityError } from "../errors.js";
import { api, csrfOk, type Deps, html, oops, readForm, redirect } from "./actions.js";
import { signInView, signUpView } from "./views/auth.js";

/** What the page says for a BAD_INPUT the API reports on a field. The API keeps its own developer wording. */
const FIELD_MESSAGES: Record<string, string> = { organizationId: "That organization is not available to you." };
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
  const said = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  // better-auth's own wording for a taken email tells a stranger nothing useful, so say it in our words.
  const error =
    said.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
      ? "email: an account with this email already exists. Sign in instead."
      : (MESSAGES[res.status] ?? said.message ?? "Something went wrong. Try again.");
  return html((mode === "sign-up" ? signUpView : signInView)({ query, error, email: form["email"] ?? "" }), res.status);
};

const json = async (res: Response): Promise<{ url?: string }> => (await res.json().catch(() => ({}))) as { url?: string };

/** A signed-in form post: check Origin, check the csrf field belongs to the session, then run. */
export const guardedPost = (app: Hono, d: Deps) => (path: string, run: (req: Request, form: Record<string, string>) => Promise<Response>) =>
  app.post(path, async (c) => {
    const form = await readForm(d, c.req.raw);
    if (form instanceof Response) return form;
    if (!(await csrfOk(d, c.req.raw, form))) return oops(new IdentityError("BAD_INPUT", "This form has expired. Go back and try again."), 403);
    return run(c.req.raw, form);
  });

/** The signed-in form posts that share one shape: check the form, check csrf, call the API, then go on. */
export const mountForms = (app: Hono, d: Deps): void => {
  const post = guardedPost(app, d);

  post("/sign-out", async (req) => redirect("/sign-in", await api(d, req, "sign-out", {})));

  post("/picker", async (req, form) => {
    // The guarded set-active route checks membership before better-auth can clear the active organization.
    const set = await api(d, req, "organization/set-active", { organizationId: form["organizationId"] });
    if (!set.ok) {
      const said = (await set.json().catch(() => ({}))) as { message?: string; field?: string };
      return oops(new IdentityError("BAD_INPUT", FIELD_MESSAGES[said.field ?? ""] ?? said.message ?? "That organization is not available to you."));
    }
    const query = form["oauth_query"] ?? "";
    if (!query) return redirect("/connections", set);
    const next = await json(await api(d, req, "oauth2/continue", { postLogin: true, oauth_query: query }));
    return redirect(next.url ?? "/connections", set);
  });

  post("/consent", async (req, form) => {
    const next = await json(await api(d, req, "oauth2/consent", { accept: form["accept"] === "true", oauth_query: form["oauth_query"] }));
    return next.url ? redirect(next.url) : oops(new IdentityError("BAD_INPUT", "The request is no longer valid. Start again from your app."));
  });
};
