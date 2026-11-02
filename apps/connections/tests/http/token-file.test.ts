import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { ann, boot, pat } from "./fixture.js";

let s: Awaited<ReturnType<typeof boot>> | undefined;
const dir = mkdtempSync(join(tmpdir(), "conn-tok-"));
afterEach(() => s?.close());
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const read = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string>>;

describe("the token file follows the account routes", () => {
  it("is rewritten on create, patch and delete", async () => {
    const file = join(dir, "tokens.json");
    s = await boot({ tokensFile: file });
    const made = (await (await s.call("POST", "/v1/accounts", ann, pat)).json()) as { id: string };
    expect(read(file)).toEqual({ ann: { github: "ghp_secret" } });
    writeFileSync(file, "{}");
    expect((await s.call("PATCH", `/v1/accounts/${made.id}`, ann, { label: "renamed" })).status).toBe(200);
    expect(read(file)).toEqual({ ann: { github: "ghp_secret" } });
    expect((await s.call("DELETE", `/v1/accounts/${made.id}`, ann)).status).toBe(204);
    expect(read(file)).toEqual({});
  });
  it("is not touched when the route refuses", async () => {
    s = await boot({ tokensFile: "/nonexistent-dir/tokens.json" });
    expect((await s.call("POST", "/v1/accounts", ann, { ...pat, dataZone: "company" })).status).toBe(403);
  });
});
