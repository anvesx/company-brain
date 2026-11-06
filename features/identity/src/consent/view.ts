import type { AuthContext } from "better-auth";
import type { Auth } from "../auth/options.js";
import { IdentityError } from "../errors.js";
import { readSession, resolveTenant } from "../guard/session.js";

type Adapter = AuthContext["adapter"];
type ClientRow = { name?: string | null; redirectUris?: unknown; scopes?: unknown };

/** A stored list column comes back as an array, or as text (JSON or space separated) depending on the driver. */
const listOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Not JSON: fall through to the space separated form.
  }
  return value.split(/[\s,]+/).filter(Boolean);
};

/**
 * What the consent page shows. Everything shown comes from the stored client row. The raw query is used only to pick
 * which row, which stored redirect and which stored scopes were asked for, so a forged query cannot put text on the page.
 */
export const consentView = async (auth: Auth, adapter: Adapter, headers: Headers, oauthQuery: string) => {
  const view = await readSession(auth, headers);
  if (!view) throw new IdentityError("UNAUTHENTICATED", "sign in first");
  // The session's organization may be unset or stale. resolveTenant falls back to the oldest membership AND writes
  // that choice to the session row, which is where the grant reads it from, so the page and the grant agree.
  const tenant = await resolveTenant(adapter, view);
  if (tenant === null) throw new IdentityError("NO_ORGANIZATION", "You do not belong to an organization yet.");
  const params = new URLSearchParams(oauthQuery);
  // Each failure names the query parameter at fault, so the person fixing the link knows which one.
  const clientId = params.get("client_id");
  if (!clientId) throw new IdentityError("BAD_INPUT", "the client_id parameter is missing", "oauth_query");
  const client = await adapter.findOne<ClientRow>({ model: "oauthClient", where: [{ field: "clientId", value: clientId }] });
  if (!client) throw new IdentityError("BAD_INPUT", "client_id does not match a registered client", "oauth_query");
  const org = await adapter.findOne<{ id: string; name: string }>({ model: "organization", where: [{ field: "id", value: tenant }] });
  if (!org) throw new IdentityError("BAD_INPUT", "the active organization no longer exists", "organization");
  const stored = listOf(client.redirectUris).find((uri) => uri === params.get("redirect_uri"));
  if (!stored) throw new IdentityError("BAD_INPUT", "redirect_uri is missing or does not match the client's registration", "oauth_query");
  const allowed = listOf(client.scopes);
  return {
    clientName: client.name ?? "an app",
    redirectHost: new URL(stored).host,
    scopes: (params.get("scope") ?? "").split(" ").filter((scope) => allowed.includes(scope)),
    organization: { id: org.id, name: org.name },
  };
};
