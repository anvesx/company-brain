import { AuthError, TransientError } from "../errors.js";

export type Fresh = { accessToken: string; refreshToken?: string; expiresInSec?: number };
export type Exchange = (refreshToken: string) => Promise<Fresh>;

/** RFC 6749 error codes that mean the grant itself is dead. A provider-specific code (e.g. "token_expired") is not in this set and is retried as transient. */
const DEAD = new Set(["invalid_grant", "invalid_client", "unauthorized_client", "invalid_token"]);

/** RFC 6749 refresh_token grant over fetch. 400/401 with a dead-grant code is AuthError; 5xx, 429, other 4xx and network errors are TransientError. */
export const httpExchange =
  (tokenUrl: string, clientId: string, clientSecret: string): Exchange =>
  async (refreshToken) => {
    let res: Response;
    try {
      res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new TransientError("token endpoint unreachable");
    }
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && typeof body["access_token"] === "string") {
      return {
        accessToken: body["access_token"],
        ...(typeof body["refresh_token"] === "string" ? { refreshToken: body["refresh_token"] } : {}),
        ...(typeof body["expires_in"] === "number" ? { expiresInSec: body["expires_in"] } : {}),
      };
    }
    if ((res.status === 400 || res.status === 401) && DEAD.has(String(body["error"])))
      throw new AuthError(`provider refused the refresh: ${String(body["error"])}`);
    throw new TransientError(`token endpoint answered ${res.status}`);
  };
