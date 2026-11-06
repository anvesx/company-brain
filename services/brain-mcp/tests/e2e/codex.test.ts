import { renderInstall } from "@anvesx/identity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gate, place, run, scratch } from "../support/cli/cli.js";
import { type BrainEnv, bootBrain } from "../support/server.js";

// Codex: write the rendered TOML where Codex reads it (CODEX_HOME/config.toml), then let Codex parse it
// back with `codex mcp list --json`. Then add a second entry with Codex's own `mcp add --url` and compare.
const cli = gate("codex");
let env: BrainEnv;
type Listed = { name: string; transport: { type: string; url?: string } }[];

beforeAll(async () => {
  if (!cli.skip) env = await bootBrain();
});
afterAll(async () => env?.close());

describe("codex mcp", () => {
  it.skipIf(cli.skip)("reads the rendered config.toml and lists the server as streamable HTTP", async () => {
    const out = renderInstall({ name: "company-brain", url: env.url }, "codex");
    const home = scratch();
    place(home, "config.toml", out.body);
    const at = { cwd: scratch(), env: { CODEX_HOME: home } };
    const listed = await run("codex", ["mcp", "list", "--json"], at);
    expect(listed.status, listed.out).toBe(0);
    const servers = JSON.parse(listed.out.slice(listed.out.indexOf("["))) as Listed;
    expect(servers.find((s) => s.name === "company-brain")?.transport).toMatchObject({ type: "streamable_http", url: env.url });
  });

  it.skipIf(cli.skip)("matches what codex mcp add writes for the same URL", async () => {
    const home = scratch();
    // BROWSER=/usr/bin/false asks the login helper not to open a browser. Codex documents no flag for this; on
    // macOS the helper may ignore BROWSER, so the 10 s timeout below is what really ends the login wait.
    const at = { cwd: scratch(), env: { CODEX_HOME: home, BROWSER: "/usr/bin/false" } };
    // Against a server that speaks OAuth, `codex mcp add` saves the entry and then waits for a browser login
    // that never comes. A short timeout ends it; the entry is on disk by then, and the listing below proves it.
    const added = await run("codex", ["mcp", "add", "company-brain", "--url", env.url], { ...at, timeoutMs: 10_000 });
    expect(added.out).toContain("Added global MCP server");
    const servers = JSON.parse((await run("codex", ["mcp", "list", "--json"], at)).out.replace(/^[^[]*/, "")) as Listed;
    expect(servers.find((s) => s.name === "company-brain")?.transport.url).toBe(env.url);
  });
});
