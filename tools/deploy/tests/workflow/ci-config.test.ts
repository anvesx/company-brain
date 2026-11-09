import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { root } from "../support/docker.js";

// spec deploy, Behaviour 12: the integration job must hand the registry token to the tests that pull the image.
type Step = { run?: string; env?: Record<string, string> };
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("integration job in CI", () => {
  it("turbo lets NODE_AUTH_TOKEN through to the integration task (turbo drops unlisted env vars)", () => {
    const turbo = JSON.parse(read("turbo.json")) as { tasks: { integration: { passThroughEnv?: string[] } } };
    expect(turbo.tasks.integration.passThroughEnv).toContain("NODE_AUTH_TOKEN");
  });

  it("the `turbo run integration` step sets NODE_AUTH_TOKEN from the NPM_READ_TOKEN secret", () => {
    const ci = parse(read(".github/workflows/ci.yml")) as { jobs: { integration: { steps: Step[] } } };
    const step = ci.jobs.integration.steps.find((s) => s.run === "pnpm turbo run integration");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is literal; sh expands it, not JavaScript
    expect(step?.env?.NODE_AUTH_TOKEN).toBe("${{ secrets.NPM_READ_TOKEN }}");
  });
});
