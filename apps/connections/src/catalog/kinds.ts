import type { Manifest } from "@brain/connectors";
import type { Kind } from "../accounts/types.js";

/** The credential kinds an account of this app may hold. An oauth2 app also accepts a pasted token or an admin token, as GitHub and Drive always did. */
export const kindsOf = (m: Manifest): Kind[] =>
  m.auth.kind === "oauth2" ? ["oauth", "pat", "admin-token"] : m.auth.kind === "token" ? ["admin-token", "pat"] : ["pat"];
