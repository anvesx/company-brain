import type { AuthorizedClient } from "../../consent/authorized.js";
import { esc, hidden, page } from "../layout.js";

/** The account page: each MCP client the user allowed, with a button that signs just that client out. */
export const accountView = (clients: AuthorizedClient[], csrf: string): string =>
  page(
    "Your account",
    `<p><a href="/connections">Back to connections</a></p>
<section aria-label="Authorized apps"><h2>Apps you allowed</h2>${
      clients.length
        ? clients
            .map(
              (c) => `<form method="post" action="/account/revoke"><strong>${esc(c.name)}</strong>
${hidden({ csrf, clientId: c.clientId })}<button type="submit">Revoke</button></form>`,
            )
            .join("\n")
        : "<p>No apps yet.</p>"
    }</section>`,
  );
