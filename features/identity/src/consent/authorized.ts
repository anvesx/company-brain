import type { AuthContext } from "better-auth";

/** One MCP client the user has allowed. */
export interface AuthorizedClient {
  clientId: string;
  name: string;
}

/** The MCP clients a user has consented to, each once, with the name stored for it. Revoking removes a client from this list. */
export const authorizedClients = async (adapter: AuthContext["adapter"], userId: string): Promise<AuthorizedClient[]> => {
  const consents = await adapter.findMany<{ clientId: string }>({ model: "oauthConsent", where: [{ field: "userId", value: userId }] });
  const ids = [...new Set(consents.map((row) => row.clientId))];
  return Promise.all(
    ids.map(async (clientId) => {
      const client = await adapter.findOne<{ name?: string | null }>({ model: "oauthClient", where: [{ field: "clientId", value: clientId }] });
      return { clientId, name: client?.name ?? "an app" };
    }),
  );
};
