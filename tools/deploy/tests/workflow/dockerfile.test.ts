import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "../support/docker.js";

// spec deploy, Behaviour 10-11: static checks that need no docker daemon, so they run everywhere.
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("Dockerfile and .dockerignore", () => {
  it("is multi-stage and the runtime stage runs as a non-root user with a HEALTHCHECK", () => {
    const d = read("Dockerfile");
    expect(d.match(/^FROM /gm)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const runtime = d.slice(d.lastIndexOf("\nFROM "));
    expect(runtime).toMatch(/^USER (?!root\b|0\b)\S+/m);
    expect(runtime).toMatch(/^HEALTHCHECK .*\/healthz/m);
    expect(runtime).toMatch(/^EXPOSE 8080$/m);
  });

  it("the HEALTHCHECK follows PORT through the shell, falling back to 8080", () => {
    const health = read("Dockerfile").match(/^HEALTHCHECK .*$/m)?.[0] ?? "";
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is literal; sh expands it, not JavaScript
    expect(health).toContain("${PORT:-8080}");
    expect(health).not.toMatch(/:8080\//); // no hardcoded port
    expect(health).not.toMatch(/CMD \[/); // exec form would not expand ${PORT}
  });

  it("reads the npm token only through a BuildKit secret mount, never ARG or ENV", () => {
    const d = read("Dockerfile");
    expect(d).toMatch(/--mount=type=secret,id=npm_token/);
    expect(d).not.toMatch(/^(ARG|ENV)\s+\S*(TOKEN|SECRET|PASSWORD)/im);
  });

  it("never copies build output or secrets into the build context", () => {
    const lines = read(".dockerignore")
      .split("\n")
      .map((l) => l.trim());
    for (const p of ["**/dist", "**/node_modules", ".git", ".claude/", ".env*", "**/*.db"]) expect(lines).toContain(p);
  });
});
