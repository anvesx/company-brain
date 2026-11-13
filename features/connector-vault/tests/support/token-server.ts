import { createServer } from "node:http";

export type Reply = { status: number; body: Record<string, unknown> };

/** A real HTTP token endpoint. `replies` are served in order (the last repeats); `seen` records each refresh token it was sent. */
export async function tokenServer(replies: Reply[], delayMs = 0) {
  const seen: string[] = [];
  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (d) => (data += d));
    req.on("end", () => {
      seen.push(new URLSearchParams(data).get("refresh_token") ?? "");
      const r = replies[Math.min(seen.length - 1, replies.length - 1)] as Reply;
      setTimeout(() => res.writeHead(r.status, { "content-type": "application/json" }).end(JSON.stringify(r.body)), delayMs);
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}/token`, seen, close: () => new Promise<void>((ok) => server.close(() => ok())) };
}
