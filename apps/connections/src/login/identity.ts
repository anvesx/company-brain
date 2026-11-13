import { createGoogleIdentity, type IdentityInput, migrateIdentity } from "@anvesx/google-identity";
import type { Caller } from "../accounts/types.js";
import { signInPage } from "./page.js";

export type Login = {
  /** The sign-in routes: `/sign-in`, `POST /sign-in/google` and `/api/auth/*`. */
  fetch: (request: Request) => Response | Promise<Response>;
  /** Who the session cookie in these headers belongs to. Each Google user is the only member of their own tenant. */
  session: (headers: Headers) => Promise<Caller | undefined>;
};

/** Create the login tables, then Google-only sign-in with the design-system page. */
export async function createLogin(input: Omit<IdentityInput, "page">): Promise<Login> {
  const config = { ...input, page: signInPage() };
  await migrateIdentity(config);
  const { auth, app } = createGoogleIdentity(config);
  return {
    fetch: app.fetch,
    session: async (headers) => {
      const found = await auth.api.getSession({ headers });
      return found ? { user: found.user.email, tenant: found.user.email } : undefined;
    },
  };
}
