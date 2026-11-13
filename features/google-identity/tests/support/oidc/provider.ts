import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import Provider, { interactionPolicy } from "oidc-provider";

// Google accepts prompt=select_account; the library only knows it once a prompt of that name exists.
const policy = interactionPolicy.base();
policy.add(new interactionPolicy.Prompt({ name: "select_account", requestable: true }, new interactionPolicy.Check("never", "never required", () => false)));

export type Person = { email: string; verified: boolean };

/** A real OpenID Connect server (node-oidc-provider) standing in for Google through its issuer URL. */
export async function startOidc(clientId: string, clientSecret: string, redirectUri: string) {
  const people = new Map<string, Person>();
  let current = "";
  const server: Server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const provider: Provider = new Provider(issuer, {
    clients: [{ client_id: clientId, client_secret: clientSecret, redirect_uris: [redirectUri], token_endpoint_auth_method: "client_secret_post" }],
    cookies: { keys: ["test-cookie-key-one", "test-cookie-key-two"] },
    claims: { openid: ["sub"], email: ["email", "email_verified"], profile: ["name"] },
    findAccount: async (_ctx, id) => ({
      accountId: id,
      claims: async () => ({ sub: id, email: people.get(id)?.email, email_verified: people.get(id)?.verified, name: id }),
    }),
    interactions: { policy, url: (_ctx, interaction) => `/interaction/${interaction.uid}` },
    // Skip the consent screen: grant what the client asked for.
    loadExistingGrant: async (ctx) => {
      const grant = new provider.Grant({ clientId: ctx.oidc.client?.clientId ?? "", accountId: ctx.oidc.session?.accountId ?? "" });
      grant.addOIDCScope("openid email profile");
      await grant.save();
      return grant;
    },
    features: { devInteractions: { enabled: false } },
    pkce: { required: () => true },
  });
  const oidc = provider.callback();
  server.on("request", async (req, res) => {
    if (!req.url?.startsWith("/interaction/")) return oidc(req, res);
    const { prompt } = await provider.interactionDetails(req, res);
    // The login page logs the chosen person in; the account picker (prompt=select_account) just accepts the session.
    const result = prompt.name === "login" ? { login: { accountId: current } } : { [prompt.name]: {} };
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
  });
  return {
    issuer,
    /** The next sign-in on the "Google" login page is this person. */
    signInAs(id: string, person: Person) {
      people.set(id, person);
      current = id;
    },
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}
