import { spawnSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { buildImage, docker, dockerSkipReason, inspectImage, root, TAG } from "../support/docker.js";

// spec deploy, Behaviour 10: what ends up inside the built image. Needs a running docker daemon.
const reason = process.env.CI === "true" ? undefined : dockerSkipReason();
if (reason) console.warn(`image hygiene tests skipped: ${reason}`);

describe.skipIf(reason !== undefined)("image hygiene", () => {
  beforeAll(() => buildImage(), 20 * 60_000);

  it("runs as a non-root user and declares a health check on /healthz", () => {
    const { Config } = inspectImage();
    expect(Config.User).not.toMatch(/^(|root|0)(:|$)/);
    expect(Config.Healthcheck?.Test.join(" ")).toContain("/healthz");
    expect(docker(["run", "--rm", "--entrypoint", "id", TAG, "-u"])).not.toBe("0");
  });

  it("keeps the npm token out of the env, the layer history and every file", () => {
    const token = process.env.NODE_AUTH_TOKEN!;
    expect(inspectImage().Config.Env.join("\n")).not.toContain("NODE_AUTH_TOKEN");
    expect(docker(["history", "--no-trunc", TAG])).not.toContain(token);
    // Export the whole filesystem of a stopped container and search the bytes for the token.
    const id = docker(["create", TAG]);
    const tar = spawnSync("docker", ["export", id], { cwd: root, maxBuffer: 2 ** 31 });
    docker(["rm", id]);
    expect(tar.status).toBe(0);
    expect(tar.stdout.includes(Buffer.from(token))).toBe(false);
  });

  it("holds no .git, .env, local database files or .npmrc under /app or any home", () => {
    const found = docker(["run", "--rm", "--entrypoint", "sh", TAG, "-c", "find /app /home -name .git -o -name '.env*' -o -name '*.db' -o -name .npmrc"]);
    expect(found).toBe("");
  });
});
