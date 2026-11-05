import { isLoopbackHost } from "../install/url.js";
import { badInput, bodyOf } from "./validate.js";

const onlyLoopbackHttp = (uris: unknown): boolean =>
  Array.isArray(uris) &&
  uris.length > 0 &&
  uris.every((uri) => {
    try {
      const url = new URL(String(uri));
      return url.protocol === "http:" && isLoopbackHost(url.hostname);
    } catch {
      return false;
    }
  });

/**
 * MCP clients do not say whether they are native apps. better-auth treats an unlabelled client as a web app
 * and refuses http loopback redirects, so a client whose every redirect is http loopback (RFC 8252) is labelled native.
 */
export const labelNativeClient = async (req: Request): Promise<Request> => {
  const body = await bodyOf(req);
  if (!body || body["application_type"] !== undefined || !onlyLoopbackHttp(body["redirect_uris"])) return req;
  return new Request(req, { body: JSON.stringify({ ...body, application_type: "native" }) });
};

type Finder = { findOne: (q: { model: string; where: { field: string; value: string }[] }) => Promise<{ redirectUris?: unknown } | null> };

/**
 * The redirect must equal one registered URI exactly, port included. Checked before better-auth runs
 * so a bad redirect gets a 400 and never a Location header that could send a code to the wrong place.
 * Returns the BAD_INPUT answer, or null when the request is fine (or names no known client).
 */
export const checkRedirect = async (req: Request, adapter: Finder): Promise<Response | null> => {
  const query = new URL(req.url).searchParams;
  const clientId = query.get("client_id");
  const redirect = query.get("redirect_uri");
  if (!clientId || !redirect) return null;
  const row = await adapter.findOne({ model: "oauthClient", where: [{ field: "clientId", value: clientId }] });
  if (!row) return null;
  const stored = typeof row.redirectUris === "string" ? (JSON.parse(row.redirectUris) as string[]) : (row.redirectUris as string[]);
  return stored.includes(redirect) ? null : badInput("redirect_uri", "redirect_uri does not match the registered one");
};
