import { type CustomSpec, MANIFEST_ID } from "@anvesx/connectors";

type Parsed = { value: CustomSpec } | { error: string };
const obj = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const text = (v: unknown): v is string => typeof v === "string" && v.trim() !== "" && v.length <= 200;
const urlOf = (v: unknown): URL | undefined => {
  try {
    return typeof v === "string" && v.length <= 500 ? new URL(v) : undefined;
  } catch {
    return undefined;
  }
};
const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];
/** https anywhere; plain http only to this machine, where a connector under development listens. */
const safe = (u: URL | undefined): u is URL => u !== undefined && (u.protocol === "https:" || (u.protocol === "http:" && LOOPBACK.includes(u.hostname)));

/** The body of `POST /v1/catalog`. The sign-in `app` is never taken from the body: a tenant cannot borrow the server's Google or GitHub client. */
export function parseCustom(body: unknown): Parsed {
  const b = obj(body);
  if (!b) return { error: "body must be a JSON object" };
  const extra = Object.keys(b).filter((k) => !["id", "name", "auth", "defaultZone", "endpoint", "canRead"].includes(k));
  if (extra.length > 0) return { error: `unknown fields: ${extra.join(", ")}` };
  if (typeof b.id !== "string" || !MANIFEST_ID.test(b.id)) return { error: "id must be 1-32 lowercase letters, digits or dashes, starting with a letter" };
  if (!text(b.name)) return { error: "name must be a non-empty string" };
  if (!safe(urlOf(b.endpoint))) return { error: "endpoint must be an https url (http only for localhost)" };
  if (b.canRead !== undefined && typeof b.canRead !== "boolean") return { error: "canRead must be true or false" };
  const z = b.defaultZone ?? "personal";
  if (z !== "personal" && z !== "team") return { error: "defaultZone must be personal or team" };
  const zone: "personal" | "team" = z;
  const a = obj(b.auth);
  const head = { id: b.id, name: b.name, defaultZone: zone, endpoint: b.endpoint as string, canRead: b.canRead === true };
  if (a?.kind === "token" || a?.kind === "pat")
    return Object.keys(a).length === 1 ? { value: { ...head, auth: { kind: a.kind } } } : { error: "auth takes only kind for token and pat" };
  if (a?.kind !== "oauth2") return { error: "auth.kind must be oauth2, token or pat" };
  const { authorizeURL: au, tokenURL: tu, scopes, pkce, extraParams } = a;
  if (!safe(urlOf(au)) || !safe(urlOf(tu))) return { error: "auth.authorizeURL and auth.tokenURL must be https urls" };
  if (!Array.isArray(scopes) || !scopes.every(text)) return { error: "auth.scopes must be an array of strings" };
  const extras = extraParams === undefined ? {} : obj(extraParams);
  if (!extras || !Object.values(extras).every(text)) return { error: "auth.extraParams must map names to strings" };
  const known = ["kind", "authorizeURL", "tokenURL", "scopes", "pkce", "extraParams"];
  if (Object.keys(a).some((k) => !known.includes(k))) return { error: "auth has unknown fields (app is not allowed)" };
  const auth = {
    kind: "oauth2" as const,
    authorizeURL: au as string,
    tokenURL: tu as string,
    scopes: scopes as string[],
    pkce: pkce === true,
    extraParams: extras as Record<string, string>,
  };
  return { value: { ...head, auth } };
}
