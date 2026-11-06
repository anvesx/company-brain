import type { AuthContext } from "better-auth";
import type { ResolvedConfig } from "../config.js";
import { IdentityError } from "../errors.js";
import { readSession } from "../guard/session.js";
import type { Auth } from "./options.js";

type Adapter = AuthContext["adapter"];

/** Insert the host's trusted clients. Safe to run on every start: a client already stored is left alone. */
export const ensureStaticClients = async (adapter: Adapter, cfg: ResolvedConfig): Promise<void> => {
  const now = new Date(cfg.now());
  // Tokens are issued for this audience, so the resource row must exist before any client links to it.
  const resourceWhere = [{ field: "identifier", value: cfg.resource }];
  if ((cfg.clients ?? []).length && !(await adapter.count({ model: "oauthResource", where: resourceWhere }))) {
    await adapter.create({
      model: "oauthResource",
      data: {
        identifier: cfg.resource,
        name: cfg.resource,
        customClaims: null,
        disabled: false,
        policyVersion: 1,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  for (const client of cfg.clients ?? []) {
    const where = [{ field: "clientId", value: client.id }];
    if (await adapter.count({ model: "oauthClient", where })) continue;
    await adapter.create({
      model: "oauthClient",
      data: {
        clientId: client.id,
        name: client.name,
        redirectUris: client.redirectUris,
        public: true,
        tokenEndpointAuthMethod: "none",
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        scopes: ["openid", "offline_access"],
        createdAt: new Date(cfg.now()),
        updatedAt: new Date(cfg.now()),
      },
    });
    // The link a dynamic client gets at registration: without it authorize answers invalid_target.
    await adapter.create({ model: "oauthClientResource", data: { clientId: client.id, resourceId: cfg.resource, createdAt: now } });
  }
};

/** Sign the user out of one MCP client: its refresh tokens and remembered consent go. Other clients are untouched. */
export const revokeClient = async (auth: Auth, adapter: Adapter, headers: Headers, clientId: string): Promise<void> => {
  const view = await readSession(auth, headers);
  if (!view) throw new IdentityError("UNAUTHENTICATED", "sign in first");
  const where = [
    { field: "clientId", value: clientId },
    { field: "userId", value: view.userId },
  ];
  await adapter.deleteMany({ model: "oauthRefreshToken", where });
  await adapter.deleteMany({ model: "oauthConsent", where });
};
