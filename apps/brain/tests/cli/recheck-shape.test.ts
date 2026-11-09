import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recheckFromEnv } from "../../src/cli/recheck.js";

// The tokens file is {"tenant:user": {source: token}}. Every other JSON shape must be refused with the
// one "must be" message, never accepted silently (a token map that reads as empty would deny everyone)
// and never a TypeError from deeper code.
const dir = mkdtempSync(join(tmpdir(), "brain-recheck-shape-"));
const env = { BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "x", BRAIN_GITHUB_REPO: "o/r" };
let n = 0;
const withFile = (value: unknown) => {
  const file = join(dir, `t${n++}.json`);
  writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
  return () => recheckFromEnv({ ...env, BRAIN_USER_TOKENS_FILE: file });
};
const shape = /must be \{"tenant:user": \{source: token\}\} with string tokens/;

describe("recheckFromEnv tokens file shape", () => {
  it.each([
    ["an array", []],
    ["null", null],
    ["a string", "str"],
    ["a number", 42],
  ])("refuses a top level that is %s", (_what, value) => {
    expect(withFile(value)).toThrow(shape);
  });

  it.each([
    ["null", { "t:u": null }],
    ["a string", { "t:u": "nope" }],
    ["an empty token", { "t:u": { github: "" } }],
    ["a numeric token", { "t:u": { github: 5 } }],
  ])("refuses a user entry that is %s", (_what, value) => {
    expect(withFile(value)).toThrow(shape);
  });

  it("refuses one bad user among good ones", () => {
    expect(withFile({ "a:b": { github: "t" }, "c:d": "nope" })).toThrow(shape);
  });

  it("refuses one bad token among good ones in the same user", () => {
    expect(withFile({ "a:b": { github: "t", drive: 7 } })).toThrow(shape);
  });

  it("accepts an empty map and a user with no sources", () => {
    expect(withFile({})).not.toThrow();
    expect(withFile({ "a:b": {} })).not.toThrow();
  });
});
