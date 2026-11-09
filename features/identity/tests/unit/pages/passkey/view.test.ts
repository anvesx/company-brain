import { describe, expect, it } from "vitest";
import { page } from "../../../../src/pages/layout.js";
import { PASSKEY_SCRIPTS, passkeySignIn, passkeysSection } from "../../../../src/pages/passkey/view.js";

const ERROR_BOX = '<p role="alert" id="passkey-error" hidden></p>';

describe("passkey page fragments", () => {
  it("the sign-in fragment is the error line, then the button carrying the escaped OAuth query", () => {
    expect(passkeySignIn('a="1"&b=2')).toBe(
      `${ERROR_BOX}<p><button type="button" id="passkey-sign-in" data-query="a=&#34;1&#34;&#38;b=2">Sign in with a passkey</button></p>`,
    );
  });

  it("the scripts are two deferred files and nothing inline", () => {
    expect(PASSKEY_SCRIPTS).toBe('<script src="/webauthn.js" defer></script><script src="/passkey.js" defer></script>');
  });

  it("an empty list says so, and still offers the add box with its error line", () => {
    expect(passkeysSection([], "tok")).toBe(
      `<section aria-label="Passkeys"><h2>Passkeys</h2><p>No passkeys yet.</p>\n${ERROR_BOX}<label>Passkey name<input id="passkey-name" type="text" autocomplete="off" placeholder="This laptop"></label>\n<p><button type="button" id="passkey-add">Add a passkey</button></p></section>`,
    );
  });

  it("each passkey is its own delete form with the csrf token and id, dated to the day, joined by a newline", () => {
    const html = passkeysSection(
      [
        { id: "p1", name: "Laptop <1>", createdAt: new Date("2026-03-04T23:59:59.000Z") },
        { id: "p2", name: "", createdAt: "2025-12-31T10:00:00.000Z" },
        { id: "p3", name: null, createdAt: "2024-01-02T00:00:00.000Z" },
      ],
      "tok&1",
    );
    const form = (name: string, day: string, id: string) =>
      `<form method="post" action="/account/passkey/delete"><strong>${name}</strong> added ${day}\n<input type="hidden" name="csrf" value="tok&#38;1"><input type="hidden" name="id" value="${id}"><button type="submit">Delete</button></form>`;
    expect(html).toContain(
      [form("Laptop &#60;1&#62;", "2026-03-04", "p1"), form("Unnamed passkey", "2025-12-31", "p2"), form("Unnamed passkey", "2024-01-02", "p3")].join("\n"),
    );
    expect(html).not.toContain("No passkeys yet.");
  });
});

describe("page style", () => {
  it("ships the shared stylesheet inside the head, rule by rule", () => {
    const html = page("T", "x");
    for (const rule of [
      "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#fafaf9;color:#1c1917}",
      "main{max-width:40rem;margin:0 auto;padding:2rem 1rem}",
      "h1{font-size:1.5rem}h2{font-size:1.125rem;margin-top:2rem}",
      "label{display:block;margin:1rem 0}input{display:block;width:100%;padding:.5rem;margin-top:.25rem;box-sizing:border-box}",
      "button{padding:.5rem 1rem;cursor:pointer}pre{background:#f5f5f4;padding:1rem;overflow:auto}",
      "[role=alert]{color:#b91c1c}",
    ])
      expect(html).toContain(rule);
    expect(html).toMatch(/<style>body\{[\s\S]*\[role=alert\]\{color:#b91c1c\}<\/style>/);
  });
});
