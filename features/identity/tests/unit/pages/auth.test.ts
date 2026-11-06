import { describe, expect, it } from "vitest";
import { signInView, signUpView } from "../../../src/pages/views/auth.js";

const input = (label: string, name: string, type: string, auto: string): string =>
  `<label>${label}<input name="${name}" type="${type}" autocomplete="${auto}" required></label>`;
const ALERT = 'role="alert"';
// The query as a browser would carry it, and its escaped form: & is 38, < is 60, > is 62.
const QUERY = "client_id=a&state=<x>";
const SAFE = "client_id=a&#38;state=&#60;x&#62;";

describe("sign-in page", () => {
  it("rule 12: a plain visit shows email and password, a Sign in button and a plain link to sign-up", () => {
    const html = signInView({ query: "" });
    expect(html).toContain("<title>Sign in</title>");
    expect(html).toContain('<h1>Sign in</h1>\n<form method="post" action="/sign-in"><input type="hidden" name="oauth_query" value="">');
    expect(html).toContain(input("Email", "email", "email", "username") + input("Password", "password", "password", "current-password"));
    expect(html).toContain('<button type="submit">Sign in</button></form>');
    expect(html).toContain('<p>New here? <a href="/sign-up">Sign up</a></p>');
    expect(html).not.toContain(ALERT);
  });

  it("rule 12: the OAuth query rides in the hidden field and the sign-up link, escaped", () => {
    const html = signInView({ query: QUERY });
    expect(html).toContain(`<input type="hidden" name="oauth_query" value="${SAFE}">`);
    expect(html).toContain(`<a href="/sign-up?${SAFE}">Sign up</a>`);
    expect(html).not.toContain("<x>");
  });

  it("rule 12: an error shows as an alert before the form, escaped", () => {
    const html = signInView({ query: "", error: "Bad <b>" });
    expect(html).toContain('<h1>Sign in</h1>\n<p role="alert">Bad &#60;b&#62;</p><form');
  });
});

describe("sign-up page", () => {
  it("rule 12: a plain visit asks for name, email and a new password and links to sign-in", () => {
    const html = signUpView({ query: "" });
    expect(html).toContain("<title>Sign up</title>");
    expect(html).toContain('<h1>Sign up</h1>\n<form method="post" action="/sign-up"><input type="hidden" name="oauth_query" value="">');
    expect(html).toContain(
      input("Name", "name", "text", "name") + input("Email", "email", "email", "username") + input("Password", "password", "password", "new-password"),
    );
    expect(html).toContain('<button type="submit">Sign up</button></form>');
    expect(html).toContain('<p>Have an account? <a href="/sign-in">Sign in</a></p>');
    expect(html).not.toContain(ALERT);
  });

  it("rule 12: the OAuth query rides in the hidden field and the sign-in link, and an error shows first", () => {
    const html = signUpView({ query: QUERY, error: "Too short" });
    expect(html).toContain(`<input type="hidden" name="oauth_query" value="${SAFE}">`);
    expect(html).toContain(`<a href="/sign-in?${SAFE}">Sign in</a>`);
    expect(html).toContain('<h1>Sign up</h1>\n<p role="alert">Too short</p><form');
  });
});
