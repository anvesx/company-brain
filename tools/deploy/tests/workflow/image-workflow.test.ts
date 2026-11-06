import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { root } from "../support/docker.js";

// spec deploy, Behaviour 12: the image workflow uses short-lived OIDC credentials only.
const path = join(root, ".github/workflows/image.yml");
type Step = { uses?: string; run?: string; with?: Record<string, unknown>; if?: string };
type Job = { if?: string; needs?: string | string[]; permissions?: Record<string, string>; steps: Step[] };
const load = () => {
  const text = readFileSync(path, "utf8");
  return { text, jobs: (parse(text) as { jobs: Record<string, Job> }).jobs };
};
const uses = (job: Job, prefix: string) => job.steps.filter((s) => s.uses?.startsWith(prefix));

describe("image workflow", () => {
  it("exists", () => expect(existsSync(path)).toBe(true));

  it("never holds a long-lived key: no credentials_json, GOOGLE_APPLICATION_CREDENTIALS or key JSON", () => {
    const { text } = load();
    for (const banned of ["credentials_json", "GOOGLE_APPLICATION_CREDENTIALS", "private_key", '"type": "service_account"']) expect(text).not.toContain(banned);
    expect(text).not.toMatch(/aws-access-key-id|aws-secret-access-key|AWS_SECRET_ACCESS_KEY/);
  });

  it("gcp job: id-token write, auth through workload identity federation, pushes to *-docker.pkg.dev", () => {
    const { jobs } = load();
    const gcp = jobs.gcp!;
    expect(gcp.permissions).toMatchObject({ "id-token": "write", contents: "read" });
    const [auth] = uses(gcp, "google-github-actions/auth@");
    expect(auth?.with).toHaveProperty("workload_identity_provider");
    expect(auth?.with).toHaveProperty("service_account");
    expect(JSON.stringify(gcp.steps)).toMatch(/-docker\.pkg\.dev\//);
  });

  it("gcp job: skipped, not failed, until the GCP_WIF_PROVIDER repository variable exists", () => {
    expect(load().jobs.gcp?.if).toBe("vars.GCP_WIF_PROVIDER != ''");
  });

  it("aws job: runs only when its role secret is set, assumes the role through OIDC", () => {
    const { jobs } = load();
    const aws = jobs.aws!;
    // GitHub has no secrets context in a job-level if, so a gate job reports presence and aws needs it.
    const gate = [aws.needs ?? []].flat()[0] ?? "";
    expect(aws.if ?? "").toMatch(new RegExp(`needs\\.${gate}\\.outputs\\.\\w+ == 'true'`));
    expect(JSON.stringify(jobs[gate]?.steps ?? [])).toMatch(/secrets\.AWS_ROLE_ARN/);
    expect(aws.permissions).toMatchObject({ "id-token": "write" });
    const [creds] = uses(aws, "aws-actions/configure-aws-credentials@");
    expect(creds?.with).toHaveProperty("role-to-assume");
    expect(uses(aws, "aws-actions/amazon-ecr-login@")).toHaveLength(1);
  });

  it("the npm token reaches the build as a BuildKit secret, never a build-arg", () => {
    const { jobs } = load();
    for (const name of ["gcp", "aws"]) {
      const [build] = uses(jobs[name]!, "docker/build-push-action@");
      expect(String(build?.with?.secrets ?? "")).toMatch(/^npm_token=\$\{\{\s*secrets\.NPM_READ_TOKEN\s*\}\}/m);
      expect(build?.with?.["build-args"]).toBeUndefined();
      expect(build?.with?.push).toBe(true);
    }
  });

  it("the Dockerfile's node major and the pnpm version match ci.yml", () => {
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const node = /node-version:\s*(\d+)/.exec(ci)?.[1];
    const pnpm = /version:\s*(8\.\d+\.\d+)/.exec(ci)?.[1];
    const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
    const froms = [...dockerfile.matchAll(/^FROM node:(\d+)-slim/gm)].map((m) => m[1]);
    expect(froms.length).toBeGreaterThan(0);
    expect(new Set(froms)).toEqual(new Set([node]));
    expect(dockerfile).toContain(`pnpm@${pnpm}`);
  });
});
