import { describe, expect, it } from "vitest";
import { connectorFromEnv } from "../../src/cli/connectors.js";
import { readEnv } from "../../src/config/index.js";

const base = { BRAIN_TENANT: "acme" };
const build = (env: Record<string, string>) => connectorFromEnv(readEnv({ ...base, ...env }), { ...base, ...env });

describe("BRAIN_CONNECTOR", () => {
  it("rejects an unknown connector and a missing tenant", () => {
    expect(() => readEnv({ BRAIN_CONNECTOR: "s3", BRAIN_TENANT: "acme" })).toThrow("invalid BRAIN_CONNECTOR: s3");
    expect(() => readEnv({ BRAIN_CONNECTOR: "github" })).toThrow("BRAIN_TENANT is required");
  });
  it("is the demo when nothing is chosen, and folder when only a root is given", () => {
    expect(build({})).toBeUndefined();
    expect(build({ BRAIN_FOLDER_ROOT: "/docs" })?.connector.id).toBe("folder");
  });
  it("names every missing setting in one message", () => {
    expect(() => build({ BRAIN_CONNECTOR: "github" })).toThrow("BRAIN_CONNECTOR=github needs GITHUB_TOKEN, BRAIN_GITHUB_REPO (owner/repo)");
    expect(() => build({ BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "t", BRAIN_GITHUB_REPO: "no-slash" })).toThrow("BRAIN_GITHUB_REPO");
    expect(() => build({ BRAIN_CONNECTOR: "drive" })).toThrow("BRAIN_CONNECTOR=drive needs DRIVE_ACCESS_TOKEN");
    expect(() => build({ BRAIN_CONNECTOR: "folder" })).toThrow("BRAIN_FOLDER_ROOT");
  });
  it("builds connectors that enforce the user's own token, indexing with the configured token", () => {
    const github = build({ BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "ght", BRAIN_GITHUB_REPO: "acme/handbook" });
    expect([github?.connector.id, github?.connector.enforcesUserToken, github?.token]).toEqual(["github", true, "ght"]);
    const drive = build({ BRAIN_CONNECTOR: "drive", DRIVE_ACCESS_TOKEN: "dat" });
    expect([drive?.connector.id, drive?.connector.enforcesUserToken, drive?.token]).toEqual(["drive", true, "dat"]);
    expect(build({ BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: "/docs" })?.connector.enforcesUserToken).toBeFalsy();
  });
});
