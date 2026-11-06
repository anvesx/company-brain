import type { AuthContext } from "better-auth";
import type { Hono } from "hono";
import { IdentityError } from "../../errors.js";
import { api, type Deps, oops, redirect } from "../actions.js";
import { guardedPost } from "../forms.js";
import { mountPasskeyAssets } from "./assets.js";
import type { PasskeyRow } from "./view.js";

/** The passkeys a user registered, oldest first, straight from the table the plugin owns. */
export const listPasskeys = (adapter: AuthContext["adapter"], userId: string): Promise<PasskeyRow[]> =>
  adapter.findMany<PasskeyRow>({ model: "passkey", where: [{ field: "userId", value: userId }], sortBy: { field: "createdAt", direction: "asc" } });

/**
 * The passkey routes around the plugin's own API: the two scripts, and the delete post from the account page.
 * Registration and sign-in need the browser's authenticator, so they are JSON calls from `/passkey.js`, not forms.
 */
export const mountPasskeys = (app: Hono, d: Deps): void => {
  mountPasskeyAssets(app);
  // The plugin checks the passkey belongs to the session's user before deleting; a stranger's id is a 404 here.
  guardedPost(app, d)("/account/passkey/delete", async (req, form) => {
    const res = await api(d, req, "passkey/delete-passkey", { id: form["id"] ?? "" });
    if (!res.ok) return oops(new IdentityError("BAD_INPUT", "That passkey is not yours or is already gone.", "id"), 404);
    return redirect("/account");
  });
};
