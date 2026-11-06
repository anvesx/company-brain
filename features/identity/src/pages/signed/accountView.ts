import type { AuthorizedClient } from "../../consent/authorized.js";
import { esc, hidden, page } from "../layout.js";
import { PASSKEY_SCRIPTS, type PasskeyRow, passkeysSection } from "../passkey/view.js";

/** The account page: the passkeys the user added, and each MCP client they allowed with a button that signs it out. */
export const accountView = (clients: AuthorizedClient[], csrf: string, passkeys: PasskeyRow[] = []): string =>
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
    }</section>
${passkeysSection(passkeys, csrf)}${PASSKEY_SCRIPTS}`,
  );
