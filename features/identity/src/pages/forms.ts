import type { Hono } from "hono";
import { IdentityError, InstallRenderError } from "../errors.js";
import { api, csrfOk, type Deps, html, readForm, redirect } from "./actions.js";
import { esc, page } from "./layout.js";

/** The error page for a refused or stale form. A broken install file is our fault, so it is a 500 that names the client. */
export const oops = (error: unknown, status = 400): Response => {
  const known = error instanceof IdentityError || error instanceof InstallRenderError;
  const code = error instanceof InstallRenderError ? 500 : status;
  return html(page("Cannot continue", `<p role="alert">${known ? esc(error.message) : "Something went wrong."}</p>`), code);
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
    const set = await api(d, req, "organization/set-active", { organizationId: form["organizationId"] });
    if (!set.ok) return oops(new IdentityError("BAD_INPUT", "That organization is not available to you."));
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
