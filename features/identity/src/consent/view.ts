import type { AuthContext } from "better-auth";
import type { Auth } from "../auth/options.js";
import { IdentityError } from "../errors.js";
import { readSession } from "../guard/session.js";

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
  if (!view || view.organizationId === null) throw new IdentityError("UNAUTHENTICATED", "sign in first");
  const params = new URLSearchParams(oauthQuery);
  const client = await adapter.findOne<ClientRow>({ model: "oauthClient", where: [{ field: "clientId", value: params.get("client_id") ?? "" }] });
  const org = await adapter.findOne<{ id: string; name: string }>({ model: "organization", where: [{ field: "id", value: view.organizationId }] });
  if (!client || !org) throw new IdentityError("BAD_INPUT", "unknown client or organization", "oauth_query");
  const stored = listOf(client.redirectUris).find((uri) => uri === params.get("redirect_uri"));
  if (!stored) throw new IdentityError("BAD_INPUT", "unknown client or organization", "oauth_query");
  const allowed = listOf(client.scopes);
  return {
    clientName: client.name ?? "an app",
    redirectHost: new URL(stored).host,
    scopes: (params.get("scope") ?? "").split(" ").filter((scope) => allowed.includes(scope)),
    organization: { id: org.id, name: org.name },
  };
};
