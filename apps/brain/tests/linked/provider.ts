import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { startReplay } from "../../../../features/identity/tests/support/replay/server.js";

const BODIES: Record<string, unknown> = {
  "/user/repos": [
    { full_name: "anvesx/company-brain", description: "Graph-only brain" },
    { full_name: "anvesx/rag", description: null },
  ],
  "/drive/v3/files": {
    files: [
      { name: "Q3 plan", mimeType: "application/vnd.google-apps.document" },
      { name: "Budget", mimeType: "application/vnd.google-apps.spreadsheet" },
    ],
  },
  "/api/conversations.list": {
    ok: true,
    channels: [
      { name: "general", num_members: 12 },
      { name: "eng", num_members: 5 },
    ],
  },
};

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const parts: Buffer[] = [];
  for await (const chunk of req) parts.push(chunk as Buffer);
  return Buffer.concat(parts);
};

/** OAuth through identity's replay server, plus the three API paths. A call with no token the replay issued gets 401. */
export async function startProvider() {
  const replay = await startReplay();
  const calls: { path: string; bearer: string }[] = [];
  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://x");
      const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "";
      if (url.pathname in BODIES) {
        calls.push({ path: url.pathname, bearer });
        if (!replay.state.grants.userFor(bearer)) return void res.writeHead(401).end("{}");
        return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(BODIES[url.pathname]));
      }
      const body = req.method === "POST" ? await readBody(req) : undefined;
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => k !== "host" && k !== "content-length")) as Record<string, string>;
      const upstream = await fetch(new URL(url.pathname + url.search, replay.base), {
        method: req.method ?? "GET",
        headers,
        ...(body && { body: body.toString() }),
        redirect: "manual",
      });
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers)).end(Buffer.from(await upstream.arrayBuffer()));
    })().catch(() => res.writeHead(502).end());
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = async () => {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await replay.close();
  };
  return { base, replay, calls, close };
}
