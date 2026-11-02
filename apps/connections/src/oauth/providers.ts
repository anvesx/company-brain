import { createBuiltinRegistry, type Listed, type Manifest, type Registry } from "@anvesx/connectors";

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

/**
 * The manifest a route name means: a built-in manifest by id or by app name (`google` is the Drive app), else a tenant's own by id.
 * Built-ins come first and a tenant manifest never answers to an app name, so it cannot reach a server client by reusing a name.
 */
export const manifestFor = (catalog: Registry, name: string, tenant: string): Manifest | undefined => {
  const all = catalog.list(tenant);
  const own = (e: Listed) => e.tenant === undefined;
  return (all.find((e) => own(e) && (e.manifest.id === name || appOf(e.manifest) === name)) ?? all.find((e) => e.manifest.id === name))?.manifest;
};

const BUILTIN = createBuiltinRegistry();

/** Every id and OAuth app name of the built-in catalog: a tenant's custom connector may not use any of them. */
export const reservedNames = (): Set<string> => new Set(BUILTIN.list().flatMap((e) => [e.manifest.id, appOf(e.manifest)]));

/**
 * The sign-in for one manifest: the app's client, redirect and endpoints as configured (a test can point them at a local server),
 * with the manifest's own scopes, PKCE flag and extra parameters. Undefined when the manifest is not oauth2 or its app has no client,
 * and for a manifest that is not built in but uses a built-in id or app name: a tenant never reaches a server client, whatever the route did.
 */
export function providerFor(oauth: Record<string, OAuthProvider> | undefined, m: Manifest): OAuthProvider | undefined {
  const app = oauth?.[appOf(m)];
  if (m.auth.kind !== "oauth2" || !app) return undefined;
  if (!BUILTIN.list().some((e) => e.manifest.id === m.id) && [m.id, appOf(m)].some((n) => reservedNames().has(n))) return undefined;
  return { ...app, source: m.id, scopes: [...m.auth.scopes], pkce: m.auth.pkce, extraParams: { ...m.auth.extraParams } };
}

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
