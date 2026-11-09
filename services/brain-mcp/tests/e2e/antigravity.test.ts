import { renderInstall } from "@anvesx/identity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gate, place, run, scratch } from "../support/cli/cli.js";
import { type BrainEnv, bootBrain } from "../support/server.js";

// Antigravity (the agy CLI): write the rendered body at ~/.gemini/config/mcp_config.json under a temp HOME
// and let agy list it. agy's own `mcp add --type http` writes the same file with a `serverUrl` key.
const cli = gate("agy");
let env: BrainEnv;

beforeAll(async () => {
  if (!cli.skip) env = await bootBrain();
});
afterAll(async () => env?.close());

describe("agy mcp", () => {
  it.skipIf(cli.skip)("lists the server from the rendered global config", async () => {
    const out = renderInstall({ name: "company-brain", url: env.url }, "antigravity");
    expect(out.path).toBe("~/.gemini/config/mcp_config.json");
    const home = scratch();
    place(home, out.path, out.body);
    const listed = await run("agy", ["mcp", "list"], { cwd: home, env: { HOME: home } });
    expect(listed.status, listed.out).toBe(0);
    expect(listed.out).toMatch(new RegExp(`company-brain\\s+http\\s+enabled\\s+${env.url.replaceAll(".", "\\.")}`));
  });

  it.skipIf(cli.skip)("matches the entry agy mcp add writes for the same URL", async () => {
    const home = scratch();
    const added = await run("agy", ["mcp", "add", "--type", "http", "company-brain", env.url], { cwd: home, env: { HOME: home } });
    expect(added.status, added.out).toBe(0);
    const file = (await run("/bin/cat", [".gemini/config/mcp_config.json"], { cwd: home })).out;
    const written = JSON.parse(file) as { mcpServers: Record<string, Record<string, unknown>> };
    const rendered = JSON.parse(renderInstall({ name: "company-brain", url: env.url }, "antigravity").body) as typeof written;
    expect(written.mcpServers["company-brain"]).toMatchObject(rendered.mcpServers["company-brain"] ?? {});
  });
});
