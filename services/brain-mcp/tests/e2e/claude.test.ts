import { renderInstall } from "@anvesx/identity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gate, run, scratch } from "../support/cli/cli.js";
import { type BrainEnv, bootBrain } from "../support/server.js";

// Claude Code: run the exact command the install guide renders, then ask the CLI to list its servers.
// CLAUDE_CONFIG_DIR and the working directory are temp folders, so the user's own config is untouched.
const cli = gate("claude");
let env: BrainEnv;

beforeAll(async () => {
  if (!cli.skip) env = await bootBrain();
});
afterAll(async () => env?.close());

describe("claude mcp", () => {
  it.skipIf(cli.skip)("adds the rendered server and lists it over HTTP", async () => {
    const out = renderInstall({ name: "company-brain", url: env.url }, "claude-code");
    expect(out.command).toBe(`claude mcp add --transport http 'company-brain' '${env.url}'`);
    const at = { cwd: scratch(), env: { CLAUDE_CONFIG_DIR: scratch() } };
    const added = await run("/bin/sh", ["-c", String(out.command)], at);
    expect(added.status, added.out).toBe(0);
    const listed = await run("claude", ["mcp", "list"], at);
    expect(listed.status, listed.out).toBe(0);
    expect(listed.out).toMatch(new RegExp(`company-brain: ${env.url.replaceAll(".", "\\.")} \\(HTTP\\)`));
  });
});
