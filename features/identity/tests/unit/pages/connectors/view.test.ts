import { describe, expect, it } from "vitest";
import { connectorsView } from "../../../../src/pages/connectors/view.js";

const tile = { id: "github", name: "GitHub", description: "Repos <all>", configured: true, by: "GitHub Inc", dataPath: "/connections/data/github" };
const account = (status: string) => ({ id: "a1", providerId: "github", label: null, createdAt: 0, status });
const li = (html: string, id: string) => html.match(new RegExp(`<li data-provider="${id}" class="tile".*?</li>`, "s"))?.[0] ?? "";

describe("connector grid", () => {
  it("renders nothing when no connector is set up", () => {
    expect(connectorsView([], [], "tok")).toBe("");
  });

  it("gives an unlinked, configured tile a plus form with the csrf token and an escaped description", () => {
    const html = li(connectorsView([tile], [], "tok"), "github");
    expect(html).toContain('<form method="post" action="/connections/link/github">');
    expect(html).toContain('aria-label="Connect GitHub"');
    expect(html).toContain('value="tok"');
    expect(html).toContain("Repos &#60;all&#62;");
    expect(html).toContain("by GitHub Inc");
    expect(html).not.toContain("View data");
  });

  it("shows a green check and a data link once an active account exists, with no plus form", () => {
    const html = li(connectorsView([tile], [account("active")], "tok"), "github");
    expect(html).toContain('aria-label="Connected"');
    expect(html).toContain('<a href="/connections/data/github">View data</a>');
    expect(html).not.toContain("<form");
  });

  it("keeps the plus when the only account needs auth again, and offers Sign in again below", () => {
    const html = connectorsView([tile], [account("needs-auth")], "tok");
    expect(li(html, "github")).toContain('aria-label="Connect GitHub"');
    expect(html).toContain("Sign in again");
  });

  it("greys out an unconfigured tile with no form, and falls back to the name for `by`", () => {
    const html = li(connectorsView([{ id: "x", name: "Acme", description: "d", configured: false }], [], "tok"), "x");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("<em>not configured</em>");
    expect(html).toContain("by Acme");
    expect(html).not.toContain("<form");
  });

  it("escapes a name in the first-letter logo fallback", () => {
    const html = connectorsView([{ id: "x", name: "<b>", description: "d", configured: true }], [], "tok");
    expect(html).not.toContain("<b>");
  });
});
