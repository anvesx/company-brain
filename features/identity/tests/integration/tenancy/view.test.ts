import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { failure, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, discover, oauthQuery, pkce } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const REDIRECT = "http://127.0.0.1:8765/cb";
/** Registers a client, then rewrites the stored columns the way another driver would have written them. */
const setup = async (columns: Record<string, string | null>) => {
  const ada = await signUp(env, "Ada");
  const meta = await discover(env.base);
  const client = await clientId(meta);
  const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce()));
  const query = oauthQuery(String(step.location));
  for (const [column, value] of Object.entries(columns)) env.db.prepare(`update oauthClient set ${column} = ? where clientId = ?`).run(value, client);
  return { headers: ada.browser.headers(), query };
};
const view = async (columns: Record<string, string | null>, edit = (q: string) => q) => {
  const { headers, query } = await setup(columns);
  return env.identity.consentView(headers, edit(query));
};

describe("consent view reads stored lists", () => {
  it("rule 7: a JSON text list of redirects and scopes is understood", async () => {
    const got = await view({ redirectUris: JSON.stringify([REDIRECT]), scopes: JSON.stringify(["openid"]) });
    expect([got.redirectHost, got.scopes]).toEqual(["127.0.0.1:8765", ["openid"]]);
  });

  it("rule 7: a JSON text that is not a list falls back to splitting the text", async () => {
    // '{"a":1}' parses as an object, so it is split as text into two pieces and neither is the asked scope.
    expect((await view({ scopes: '{"a":1}' })).scopes).toEqual([]);
  });

  it("rule 7: a value that is neither a list nor text allows no scope", async () => {
    expect((await view({ scopes: null })).scopes).toEqual([]);
  });

  it("rule 7: a client without a name is shown as 'an app'", async () => {
    expect((await view({ name: null })).clientName).toBe("an app");
  });

  it("rule 7: an unknown client is BAD_INPUT on the oauth_query field", async () => {
    const { headers, query } = await setup({});
    const error = await failure(env.identity.consentView(headers, query.replace(/client_id=[^&]*/, "client_id=nope")));
    expect([error.code, error.field, error.message]).toEqual(["BAD_INPUT", "oauth_query", "oauth_query: unknown client or organization"]);
  });

  it("rule 7: a redirect that is only a prefix of a stored one is BAD_INPUT", async () => {
    const edit = (q: string) => q.replace(/redirect_uri=[^&]*/, `redirect_uri=${encodeURIComponent(`${REDIRECT}/x`)}`);
    const { headers, query } = await setup({});
    const error = await failure(env.identity.consentView(headers, edit(query)));
    expect([error.code, error.field]).toEqual(["BAD_INPUT", "oauth_query"]);
  });

  it("rule 7: with no session the view says sign in first", async () => {
    const { query } = await setup({});
    const error = await failure(env.identity.consentView(new Headers(), query));
    expect([error.code, error.message]).toEqual(["UNAUTHENTICATED", "sign in first"]);
  });
});
