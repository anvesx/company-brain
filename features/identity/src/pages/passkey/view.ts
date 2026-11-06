import { esc, hidden } from "../layout.js";

/** A passkey row as better-auth stores it; only what the page shows. */
export interface PasskeyRow {
  id: string;
  name: string | null;
  createdAt: Date | string;
}

/** The scripts a page with passkey buttons loads. Both are files, so the page itself still has no inline script. */
export const PASSKEY_SCRIPTS = '<script src="/webauthn.js" defer></script><script src="/passkey.js" defer></script>';

/** The shared error line. `/passkey.js` fills it and shows it when the authenticator or the server says no. */
const errorBox = '<p role="alert" id="passkey-error" hidden></p>';

/** The sign-in alternative under the password form. The OAuth query rides on the button so success continues it. */
export const passkeySignIn = (query: string): string =>
  `${errorBox}<p><button type="button" id="passkey-sign-in" data-query="${esc(query)}">Sign in with a passkey</button></p>`;

const when = (at: Date | string): string => (at instanceof Date ? at : new Date(at)).toISOString().slice(0, 10);

/** The account section: each passkey with a delete form (a real post, CSRF-checked), and a box to add one. */
export const passkeysSection = (passkeys: PasskeyRow[], csrf: string): string =>
  `<section aria-label="Passkeys"><h2>Passkeys</h2>${
    passkeys.length
      ? passkeys
          .map(
            (p) => `<form method="post" action="/account/passkey/delete"><strong>${esc(p.name || "Unnamed passkey")}</strong> added ${when(p.createdAt)}
${hidden({ csrf, id: p.id })}<button type="submit">Delete</button></form>`,
          )
          .join("\n")
      : "<p>No passkeys yet.</p>"
  }
${errorBox}<label>Passkey name<input id="passkey-name" type="text" autocomplete="off" placeholder="This laptop"></label>
<p><button type="button" id="passkey-add">Add a passkey</button></p></section>`;
