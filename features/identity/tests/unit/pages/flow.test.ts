import { describe, expect, it } from "vitest";
import { accountView } from "../../../src/pages/signed/accountView.js";
import { consentView, pickerView } from "../../../src/pages/views/flow.js";

const hiddenInput = (name: string, value: string): string => `<input type="hidden" name="${name}" value="${value}">`;

describe("organization picker", () => {
  it("rule 3: one form per organization, each carrying its id, csrf and the OAuth query, button text is the name", () => {
    const html = pickerView(
      [
        { id: "o1", name: "Acme & Co" },
        { id: "o2", name: "Beta" },
      ],
      "tok",
      "q=1",
    );
    const first = `<form method="post" action="/picker">${hiddenInput("csrf", "tok")}${hiddenInput("oauth_query", "q=1")}${hiddenInput("organizationId", "o1")}\n<button type="submit">Acme &#38; Co</button></form>`;
    expect(html).toContain("<title>Choose an organization</title>");
    // The forms are joined by a single newline.
    expect(html).toContain(`${first}\n<form method="post" action="/picker">`);
    expect(html).toContain(`${hiddenInput("organizationId", "o2")}\n<button type="submit">Beta</button></form>`);
  });
});

describe("consent page", () => {
  const info = { clientName: "Cur<sor>", redirectHost: "127.0.0.1:8123", scopes: ["openid", "mcp"], organization: { id: "o1", name: "Acme" } };

  it("rule 7: names the client, organization, scopes and redirect host, with Allow and Deny buttons", () => {
    const html = consentView(info, "tok", "client_id=c");
    expect(html).toContain("<title>Allow Cur&#60;sor&#62;?</title>");
    expect(html).toContain("<p><strong>Cur&#60;sor&#62;</strong> wants to use the <strong>Acme</strong> organization.</p>");
    expect(html).toContain("<p>Permissions: openid, mcp</p>");
    expect(html).toContain("<p>After you choose, you are sent to <code>127.0.0.1:8123</code>.</p>");
    expect(html).toContain(`<form method="post" action="/consent">${hiddenInput("csrf", "tok")}${hiddenInput("oauth_query", "client_id=c")}\n`);
    expect(html).toContain(
      '<button type="submit" name="accept" value="true">Allow</button>\n<button type="submit" name="accept" value="false">Deny</button></form>',
    );
  });

  it("rule 7: no granted scopes reads as none", () => {
    expect(consentView({ ...info, scopes: [] }, "t", "q")).toContain("<p>Permissions: none</p>");
  });
});

describe("account page", () => {
  it("rule 11: with no allowed apps it says so and links back to connections", () => {
    const html = accountView([], "tok");
    expect(html).toContain("<title>Your account</title>");
    expect(html).toContain('<p><a href="/connections">Back to connections</a></p>');
    expect(html).toContain('<section aria-label="Authorized apps"><h2>Apps you allowed</h2><p>No apps yet.</p></section>');
  });

  it("rule 11: each allowed app is its own Revoke form carrying csrf and its client id, joined by newlines", () => {
    const html = accountView(
      [
        { clientId: "c1", name: "A&B" },
        { clientId: "c2", name: "Two" },
      ],
      "tok",
    );
    const form1 = `<form method="post" action="/account/revoke"><strong>A&#38;B</strong>\n${hiddenInput("csrf", "tok")}${hiddenInput("clientId", "c1")}<button type="submit">Revoke</button></form>`;
    expect(html).toContain(`${form1}\n<form method="post" action="/account/revoke"><strong>Two</strong>`);
    expect(html).not.toContain("No apps yet.");
  });
});
