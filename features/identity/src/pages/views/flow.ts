import { esc, hidden, page } from "../layout.js";
/** One button per organization. Each is its own form, so the button text is the organization's name. */
export const pickerView = (orgs: { id: string; name: string }[], csrf: string, query: string): string =>
  page(
    "Choose an organization",
    orgs
      .map(
        (org) => `<form method="post" action="/picker">${hidden({ csrf, oauth_query: query, organizationId: org.id })}
<button type="submit">${esc(org.name)}</button></form>`,
      )
      .join("\n"),
  );

export interface ConsentInfo {
  clientName: string;
  redirectHost: string;
  scopes: string[];
  organization: { id: string; name: string };
}

/** Says who is asking, for which organization and scopes, and where the result is sent. Two buttons, no script. */
export const consentView = (info: ConsentInfo, csrf: string, query: string): string =>
  page(
    `Allow ${info.clientName}?`,
    `<p><strong>${esc(info.clientName)}</strong> wants to use the <strong>${esc(info.organization.name)}</strong> organization.</p>
<p>Permissions: ${info.scopes.map(esc).join(", ") || "none"}</p>
<p>After you choose, you are sent to <code>${esc(info.redirectHost)}</code>.</p>
<form method="post" action="/consent">${hidden({ csrf, oauth_query: query })}
<button type="submit" name="accept" value="true">Allow</button>
<button type="submit" name="accept" value="false">Deny</button></form>`,
  );
