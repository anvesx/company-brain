import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, PASSWORD, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const QUERY = "client_id=c1&state=s%201";
const post = (path: string, form: Record<string, string>, b = new Browser(env.base)) => b.call(path, { form });
const signIn = (email: string, password: string, extra: Record<string, string> = {}) => post("/sign-in", { email, password, ...extra });

describe("POST /sign-in", () => {
  it("rule 2: a right password is 302 to /connections with a session cookie", async () => {
    const ada = await signUp(env, "Ada");
    const res = await signIn(ada.email, PASSWORD);
    expect([res.status, res.headers.get("location")]).toEqual([302, "/connections"]);
    expect(res.headers.getSetCookie().join("\n")).toContain("session_token=");
  });

  it("rule 2: with an oauth_query the 302 continues the authorize request and keeps the cookie", async () => {
    const ada = await signUp(env, "Ada");
    const res = await signIn(ada.email, PASSWORD, { oauth_query: QUERY });
    expect(res.headers.get("location")).toBe(`/api/auth/oauth2/authorize?${QUERY}`);
    expect(res.headers.getSetCookie().join("\n")).toContain("session_token=");
  });

  it("rule 2: a wrong password is 401, says so, sets no cookie and keeps the query in the form", async () => {
    const ada = await signUp(env, "Ada");
    const res = await signIn(ada.email, "wrong-password-123", { oauth_query: QUERY });
    const body = await res.text();
    expect(res.status).toBe(401);
    expect(body).toContain('<p role="alert">The email or password is wrong.</p>');
    expect(body).toContain(`name="oauth_query" value="client_id=c1&#38;state=s%201"`);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("rule 2: the sixth attempt is 429 with the wait message", async () => {
    const ada = await signUp(env, "Ada");
    for (let i = 0; i < 5; i++) expect((await signIn(ada.email, "wrong-password-123")).status).toBe(401);
    const res = await signIn(ada.email, PASSWORD);
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("Too many attempts. Wait a few minutes and try again.");
  });
});

describe("POST /sign-up", () => {
  it("rule 1: a new account is 302 to /connections with a session cookie", async () => {
    const res = await post("/sign-up", { name: "Bo", email: "bo@example.com", password: PASSWORD });
    expect([res.status, res.headers.get("location")]).toEqual([302, "/connections"]);
    expect(res.headers.getSetCookie().join("\n")).toContain("session_token=");
  });

  it("rule 1: with an oauth_query the 302 continues the authorize request", async () => {
    const res = await post("/sign-up", { name: "Bo", email: "bo@example.com", password: PASSWORD, oauth_query: QUERY });
    expect(res.headers.get("location")).toBe(`/api/auth/oauth2/authorize?${QUERY}`);
  });

  it("rule 13: a weak password is 400 with the API's message, and the query stays in the form", async () => {
    const res = await post("/sign-up", { name: "Bo", email: "bo@example.com", password: "password1234", oauth_query: QUERY });
    const body = await res.text();
    expect(res.status).toBe(400);
    expect(body).toContain('<p role="alert">password: is too easy to guess: avoid common words, keyboard runs and repeats</p>');
    expect(body).toContain(`name="oauth_query" value="client_id=c1&#38;state=s%201"`);
  });
});
