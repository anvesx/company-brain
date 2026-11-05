import type { AuthContext } from "better-auth";
import { readSession, type SessionView } from "../../guard/session.js";
import { createCsrf } from "../../port.js";
import { type Deps, redirect } from "../actions.js";
import { oops } from "../forms.js";

/** The query string of a URL without the leading question mark. */
export const queryOf = (url: string): string => new URL(url).search.slice(1);

/** The helpers every signed-in page shares: the database adapter and a wrapper that demands a session. */
export const signedInPages = (d: Deps) => {
  const csrf = createCsrf(d.auth, d.cfg);
  const adapter = async () => (await d.auth.$context).adapter as AuthContext["adapter"];
  /** No session means sign in first, and the OAuth query rides along so the flow can continue. */
  const signedIn = (run: (req: Request, view: SessionView, token: string) => Promise<Response>) => async (c: { req: { raw: Request } }) => {
    const req = c.req.raw;
    const view = await readSession(d.auth, req.headers);
    if (!view) return redirect(`/sign-in${queryOf(req.url) ? `?${queryOf(req.url)}` : ""}`);
    try {
      return await run(req, view, await csrf.issue(req.headers));
    } catch (error) {
      return oops(error);
    }
  };
  return { adapter, signedIn };
};
