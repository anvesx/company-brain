import type { Hono } from "hono";
import { revokeClient } from "../../auth/clients.js";
import { authorizedClients } from "../../consent/authorized.js";
import { type Deps, html, redirect } from "../actions.js";
import { guardedPost } from "../forms.js";
import { listPasskeys, mountPasskeys } from "../passkey/mount.js";
import { accountView } from "./accountView.js";
import type { signedInPages } from "./guard.js";

/** `/account`: passkeys and the MCP clients the user allowed; `POST /account/revoke` removes a client (refresh tokens and remembered consent). */
export const mountAccount = (app: Hono, d: Deps, pages: ReturnType<typeof signedInPages>): void => {
  app.get(
    "/account",
    pages.signedIn(async (_req, view, token) => {
      const db = await pages.adapter();
      return html(accountView(await authorizedClients(db, view.userId), token, await listPasskeys(db, view.userId)));
    }),
  );
  mountPasskeys(app, d);
  guardedPost(app, d)("/account/revoke", async (req, form) => {
    await revokeClient(d.auth, await pages.adapter(), req.headers, form["clientId"] ?? "");
    return redirect("/account");
  });
};
