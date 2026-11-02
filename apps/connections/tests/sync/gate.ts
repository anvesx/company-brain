import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

/** A pass-through to `upstream` that can hold requests: `hold()` makes the next ones wait, `reached` says one arrived, `release()` lets them go. */
export async function startGate(upstream: string) {
  let open: () => void = () => {};
  let wait: Promise<void> = Promise.resolve();
  let arrived: () => void = () => {};
  let reached: Promise<void> = new Promise<void>((r) => (arrived = r));
  const server = createServer(async (req, res) => {
    arrived();
    await wait;
    const up = await fetch(upstream + (req.url ?? "/"), { headers: { authorization: String(req.headers.authorization ?? "") } });
    res.writeHead(up.status, { "content-type": up.headers.get("content-type") ?? "application/json" });
    res.end(await up.text());
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    hold: () => {
      wait = new Promise<void>((r) => (open = r));
      reached = new Promise<void>((r) => (arrived = r));
    },
    reached: () => reached,
    release: () => open(),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
