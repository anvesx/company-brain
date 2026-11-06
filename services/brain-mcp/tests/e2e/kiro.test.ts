import { renderInstall } from "@anvesx/identity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gate, place, run, scratch, uniqueName } from "../support/cli/cli.js";
import { type BrainEnv, bootBrain } from "../support/server.js";

// Kiro: write the rendered body at the template's workspace path (.kiro/settings/mcp.json) in a temp
// working directory and let kiro-cli list it. kiro-cli needs the user's login, so HOME stays real; the
// server name is unique per run, so an entry in the user's own config cannot satisfy the assertion.
const cli = gate("kiro-cli");
let env: BrainEnv;

beforeAll(async () => {
  if (!cli.skip) env = await bootBrain();
});
afterAll(async () => env?.close());

describe("kiro-cli mcp", () => {
  it.skipIf(cli.skip)("lists the server from the rendered workspace config", async () => {
    const name = uniqueName();
    const out = renderInstall({ name, url: env.url }, "kiro");
    expect(out.path).toBe(".kiro/settings/mcp.json");
    const cwd = scratch();
    place(cwd, out.path, out.body);
    const listed = await run("kiro-cli", ["mcp", "list"], { cwd });
    expect(listed.status, listed.out).toBe(0);
    expect(listed.out).toContain(name);
  });

  it.skipIf(cli.skip)("writes the same entry shape with kiro-cli mcp add --scope workspace", async () => {
    const name = uniqueName();
    const cwd = scratch();
    const added = await run("kiro-cli", ["mcp", "add", "--name", name, "--url", env.url, "--scope", "workspace"], { cwd });
    expect(added.status, added.out).toBe(0);
    const rendered = JSON.parse(renderInstall({ name, url: env.url }, "kiro").body) as { mcpServers: Record<string, unknown> };
    const written = JSON.parse((await run("/bin/cat", [".kiro/settings/mcp.json"], { cwd })).out) as { mcpServers: Record<string, unknown> };
    expect(written.mcpServers[name]).toMatchObject(rendered.mcpServers[name] as object);
  });
});
