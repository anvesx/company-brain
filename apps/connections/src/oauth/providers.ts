import { createBuiltinRegistry, type Manifest, type Registry } from "@anvesx/connectors";

export type OAuthProvider = {
  /** The account provider id this sign-in creates: the manifest id. */
  source: string;
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  authorizeURL: string;
  tokenURL: string;
  scopes: string[];
  pkce: boolean;
  extraParams: Record<string, string>;
};

type Given = { clientId: string; clientSecret: string; redirectURI: string; authorizeURL?: string; tokenURL?: string };

/** The OAuth app (client id and secret) a manifest signs in through; manifests with the same app share one client and one flow. */
export const appOf = (m: Manifest): string => (m.auth.kind === "oauth2" ? (m.auth.app ?? m.id) : m.id);

/** The manifest a route name means: a manifest id, else the first manifest of an app with that name (`google` is the Drive app). */
export const manifestFor = (catalog: Registry, name: string, tenant: string): Manifest | undefined =>
  catalog.get(name, tenant) ?? catalog.list(tenant).find((e) => appOf(e.manifest) === name)?.manifest;

/**
 * The sign-in for one manifest: the app's client, redirect and endpoints as configured (a test can point them at a local server),
 * with the manifest's own scopes, PKCE flag and extra parameters. Undefined when the manifest is not oauth2 or its app has no client.
 */
export function providerFor(oauth: Record<string, OAuthProvider> | undefined, m: Manifest): OAuthProvider | undefined {
  const app = oauth?.[appOf(m)];
  if (m.auth.kind !== "oauth2" || !app) return undefined;
  return { ...app, source: m.id, scopes: [...m.auth.scopes], pkce: m.auth.pkce, extraParams: { ...m.auth.extraParams } };
}

const BUILTIN = createBuiltinRegistry();

/** An OAuth app's client for a built-in manifest's app (`github`, `google`), with that manifest's endpoints unless `given` overrides them. */
export const oauthProvider = (app: string, g: Given): OAuthProvider => {
  const m = BUILTIN.list().find((e) => appOf(e.manifest) === app)?.manifest;
  if (m?.auth.kind !== "oauth2") throw new RangeError(`no built-in oauth app named ${app}`);
  const a = m.auth;
  return {
    source: m.id,
    clientId: g.clientId,
    clientSecret: g.clientSecret,
    redirectURI: g.redirectURI,
    authorizeURL: g.authorizeURL ?? a.authorizeURL,
    tokenURL: g.tokenURL ?? a.tokenURL,
    scopes: [...a.scopes],
    pkce: a.pkce,
    extraParams: { ...a.extraParams },
  };
};
