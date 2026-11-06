import { type Browser, json, signUp } from "../../../../features/identity/tests/support/http.js";
import { connect } from "../../../../features/identity/tests/support/oauth.js";
import type { BrainEnv } from "./server.js";

/** A signed-up person holding a real OAuth access token for /mcp, issued by the identity server. */
export type Member = { userId: string; tenant: string; token: string; browser: Browser };

/** Signs up a person in their own personal organisation and runs the full OAuth flow for /mcp. */
export async function member(env: BrainEnv, name: string): Promise<Member> {
  const p = await signUp(env, name);
  const tenant = (await env.identity.port.require(p.browser.headers())).tenant;
  const { tokens } = await connect(p.browser, env.base, env.config.resource);
  return { userId: p.userId, tenant, token: tokens.access_token, browser: p.browser };
}

/** Invites a second person into `host`'s organisation and issues their token for that organisation. */
export async function colleague(env: BrainEnv, host: Member, name: string): Promise<Member> {
  const email = `${name.toLowerCase()}@example.com`;
  const sent = await host.browser.call("/api/auth/organization/invite-member", {
    json: { email, role: "member", organizationId: host.tenant },
  });
  const p = await signUp(env, name, email);
  await p.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId: (await json<{ id: string }>(sent)).id } });
  const pick = (b: Browser) => b.call("/api/auth/organization/set-active", { json: { organizationId: host.tenant } });
  const { tokens } = await connect(p.browser, env.base, env.config.resource, pick);
  return { userId: p.userId, tenant: host.tenant, token: tokens.access_token, browser: p.browser };
}

/** Links a real provider account row to the user, shaped exactly like the user's own credential row. */
export function linkAccount(env: BrainEnv, userId: string, providerId: string, secrets: { access: string; refresh: string }) {
  const own = env.db.prepare("SELECT * FROM account WHERE userId = ?").get(userId) as Record<string, unknown>;
  const row = { ...own, id: `acct-${providerId}-${userId}`, providerId, accountId: `${providerId}-${userId}`, password: null };
  Object.assign(row, { accessToken: secrets.access, refreshToken: secrets.refresh });
  const cols = Object.keys(row);
  const sql = `INSERT INTO account (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`;
  env.db.prepare(sql).run(...(Object.values(row) as (string | number | null)[]));
}
