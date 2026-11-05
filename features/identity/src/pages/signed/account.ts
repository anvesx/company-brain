import type { Hono } from "hono";
import { revokeClient } from "../../auth/clients.js";
import { authorizedClients } from "../../consent/authorized.js";
import { type Deps, html, redirect } from "../actions.js";
import { guardedPost } from "../forms.js";
import { accountView } from "./accountView.js";
import type { signedInPages } from "./guard.js";

/** `/account`: list the MCP clients the user allowed, and `POST /account/revoke` to remove one (refresh tokens and remembered consent). */
export const mountAccount = (app: Hono, d: Deps, pages: ReturnType<typeof signedInPages>): void => {
  app.get(
    "/account",
    pages.signedIn(async (_req, view, token) => html(accountView(await authorizedClients(await pages.adapter(), view.userId), token))),
  );
  guardedPost(app, d)("/account/revoke", async (req, form) => {
    await revokeClient(d.auth, await pages.adapter(), req.headers, form["clientId"] ?? "");
    return redirect("/account");
  });
};
