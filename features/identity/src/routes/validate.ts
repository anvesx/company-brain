import { getConnInfo } from "@hono/node-server/conninfo";
import type { AuthContext } from "better-auth";
import type { Context } from "hono";
import { isMember } from "../auth/hooks.js";
import type { Auth } from "../auth/options.js";
import { IdentityError } from "../errors.js";
import { readSession } from "../guard/session.js";
import { checkEmail, checkPassword } from "../policy/password.js";

/** The JSON body of a request, read from a clone so better-auth can still read the original. Null when it is not JSON. */
export const bodyOf = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body: unknown = await req.clone().json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** A 400 with a code and the name of the bad field, the shape every BAD_INPUT takes on the wire. */
export const badInput = (field: string, message: string, extra: Record<string, unknown> = {}): Response =>
  Response.json({ code: "BAD_INPUT", field, message, ...extra }, { status: 400 });

/** Sign-up rules run before better-auth sees the request: a well-formed email and an acceptable password. */
export const checkSignUp = async (req: Request): Promise<Response | null> => {
  const body = await bodyOf(req);
  try {
    checkEmail(String(body?.["email"] ?? ""));
    checkPassword(String(body?.["password"] ?? ""));
    return null;
  } catch (error) {
    if (error instanceof IdentityError && error.field) return badInput(error.field, error.message);
    throw error;
  }
};

/**
 * better-auth clears the session's active organization BEFORE it checks the new one, so a refused or empty switch
 * would leave a signed-in user with none. Check first: the body must name an organization the caller belongs to.
 * With no session this returns null and better-auth answers 401 as usual. Only JSON is read here, so any other
 * content type is refused up front: a form naming the caller's own organization would otherwise get a misleading
 * "name an organization you belong to".
 */
export const checkSetActive = async (req: Request, auth: Auth): Promise<Response | null> => {
  const view = await readSession(auth, req.headers);
  if (!view) return null;
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return badInput("body", "body: send JSON");
  const id = (await bodyOf(req))?.["organizationId"];
  const adapter = (await auth.$context).adapter as AuthContext["adapter"];
  if (typeof id === "string" && id.trim() !== "" && (await isMember(adapter, view.userId, id))) return null;
  return badInput("organizationId", "organizationId: name an organization you belong to");
};

/** The shared key used when no address is known. */
const GLOBAL = "global";

/**
 * The key a client is rate limited under. It is the socket address, which a client cannot choose.
 * X-Forwarded-For is read only when the host says (`trustProxy`) that a reverse proxy it controls sets it, and then
 * the LAST hop is used: that is the one our own proxy appended, while earlier hops are whatever the client sent.
 * With no known address (no socket, for example a call made inside the process) every caller shares one global key,
 * so the limit still holds, just for everyone together.
 */
export const addressOf = (c: Context, trustProxy: boolean): string => {
  if (trustProxy) {
    const hops = c.req.header("x-forwarded-for")?.split(",") ?? [];
    const last = hops[hops.length - 1]?.trim();
    if (last) return last;
  }
  try {
    return getConnInfo(c).remote.address || GLOBAL;
  } catch {
    // getConnInfo throws when there is no Node socket behind the request.
    return GLOBAL;
  }
};

/** 429 with the seconds to wait. */
export const tooMany = (seconds: number): Response =>
  Response.json({ error: "too_many_requests" }, { status: 429, headers: { "retry-after": String(seconds) } });
