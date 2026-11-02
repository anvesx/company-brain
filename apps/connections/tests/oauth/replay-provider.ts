import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

type Grant = { redirectUri: string; challenge: string | null };
export type Replay = { url: string; tokenCalls: number; close: () => void };

const form = (req: IncomingMessage): Promise<URLSearchParams> =>
  new Promise((ok) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
    });
    req.on("end", () => ok(new URLSearchParams(b)));
  });

/** A local OAuth2 provider that speaks the real protocol: authorize redirect, single-use codes, basic-auth client, PKCE S256, JSON tokens. */
export async function startReplay(
  client: { id: string; secret: string },
  opts: { refresh?: boolean; deny?: boolean; revoke?: boolean; rotate?: boolean } = {},
): Promise<Replay> {
  const grants = new Map<string, Grant>();
  const out = { url: "", tokenCalls: 0, close: () => {} };
  const send = (res: import("node:http").ServerResponse, status: number, body: object) => {
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  };
  const server: Server = createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", "http://replay");
    if (req.method === "GET" && u.pathname === "/authorize") {
      const q = u.searchParams;
      const back = new URL(q.get("redirect_uri") ?? "");
      back.searchParams.set("state", q.get("state") ?? "");
      if (q.get("client_id") !== client.id || q.get("response_type") !== "code" || !q.get("state")) back.searchParams.set("error", "invalid_request");
      else if (opts.deny) back.searchParams.set("error", "access_denied");
      else {
        const code = randomBytes(8).toString("hex");
        grants.set(code, { redirectUri: back.origin + back.pathname, challenge: q.get("code_challenge_method") === "S256" ? q.get("code_challenge") : null });
        back.searchParams.set("code", code);
      }
      return void res.writeHead(302, { location: back.toString() }).end();
    }
    if (req.method === "POST" && u.pathname === "/token") {
      out.tokenCalls++;
      const f = await form(req);
      const basic = Buffer.from(`${client.id}:${client.secret}`).toString("base64");
      if (f.get("grant_type") === "refresh_token") {
        const ok = !opts.revoke && req.headers.authorization === `Basic ${basic}` && (f.get("refresh_token") ?? "").startsWith("rt_");
        if (!ok) return send(res, 400, { error: "invalid_grant" });
        const body = { access_token: `at_refreshed_${out.tokenCalls}`, token_type: "bearer", expires_in: 3600 };
        return send(res, 200, opts.rotate ? { ...body, refresh_token: `rt_rotated_${out.tokenCalls}` } : body);
      }
      const grant = grants.get(f.get("code") ?? "");
      grants.delete(f.get("code") ?? "");
      const pkceOk =
        !grant?.challenge ||
        createHash("sha256")
          .update(f.get("code_verifier") ?? "")
          .digest("base64url") === grant.challenge;
      if (req.headers.authorization !== `Basic ${basic}` || !grant || grant.redirectUri !== f.get("redirect_uri") || !pkceOk)
        return send(res, 400, { error: "invalid_grant" });
      return send(res, 200, {
        access_token: `at_${f.get("code")}`,
        token_type: "bearer",
        expires_in: 3600,
        ...(opts.refresh && { refresh_token: `rt_${f.get("code")}` }),
      });
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  out.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  out.close = () => server.close();
  return out;
}
