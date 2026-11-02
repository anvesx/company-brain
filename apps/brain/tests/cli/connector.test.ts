import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { connectorFromEnv } from "../../src/cli/connector.js";

type Seen = { url: string; auth: string | undefined };
let server: Server | undefined;
afterEach(() => server?.close());

/** A local HTTP source that records what the connector asked for, then answers 500. */
async function source(): Promise<{ base: string; seen: Seen[] }> {
  const seen: Seen[] = [];
  server = createServer((req: IncomingMessage, res) => {
    seen.push({ url: req.url ?? "", auth: req.headers.authorization });
    res.writeHead(500).end("{}");
  });
  await new Promise<void>((ok) => server?.listen(0, "127.0.0.1", ok));
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen };
}

describe("connectorFromEnv", () => {
  it("builds a folder connector named folder", () => {
    expect(connectorFromEnv({ BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: "/tmp" }).id).toBe("folder");
  });
  it("names the missing variables", () => {
    expect(() => connectorFromEnv({ BRAIN_CONNECTOR: "folder" })).toThrow("BRAIN_CONNECTOR=folder needs BRAIN_FOLDER_ROOT");
    expect(() => connectorFromEnv({ BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "t" })).toThrow("needs BRAIN_GITHUB_REPO");
    expect(() => connectorFromEnv({ BRAIN_CONNECTOR: "drive" })).toThrow("needs DRIVE_ACCESS_TOKEN");
  });
  it("rejects anything but owner/repo", () => {
    for (const bad of ["repo", "a/b/c", "/b", "a/", " a/b", "a /b"]) {
      expect(() => connectorFromEnv({ BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "t", BRAIN_GITHUB_REPO: bad })).toThrow("owner/repo");
    }
  });
  it("rejects an unknown or absent connector", () => {
    expect(() => connectorFromEnv({ BRAIN_CONNECTOR: "slack" })).toThrow("folder, github or drive");
    expect(() => connectorFromEnv({})).toThrow("folder, github or drive");
  });
  it("lists a github repo with the given owner, repo, token and base url", async () => {
    const { base, seen } = await source();
    const c = connectorFromEnv({ BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "tok1", BRAIN_GITHUB_REPO: "acme/wiki", BRAIN_GITHUB_API_URL: base });
    expect(c.id).toBe("github");
    await c.list({ limit: 5 }).catch(() => undefined);
    expect(seen[0]?.url).toContain("/repos/acme/wiki");
    expect(seen[0]?.auth).toContain("tok1");
  });
  it("lists drive with the given token and root url", async () => {
    const { base, seen } = await source();
    const c = connectorFromEnv({ BRAIN_CONNECTOR: "drive", DRIVE_ACCESS_TOKEN: "tok2", BRAIN_DRIVE_ROOT_URL: `${base}/` });
    expect(c.id).toBe("drive");
    await c.list({ limit: 5 }).catch(() => undefined);
    expect(seen[0]?.url).toContain("/drive/v3/files");
    expect(seen[0]?.auth).toBe("Bearer tok2");
  });
});
