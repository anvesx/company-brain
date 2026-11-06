import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The repository root, where the Dockerfile and .dockerignore live.
export const root = fileURLToPath(new URL("../../../../", import.meta.url));
export const TAG = "company-brain:test";

// Run the docker CLI and return its trimmed stdout. Throws (with docker's stderr) on a non-zero exit.
export const docker = (args: string[], timeoutMs = 60_000): string =>
  execFileSync("docker", args, { cwd: root, encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Why the image tests cannot run here, or undefined when they can. Under CI=true the caller fails instead. */
export function dockerSkipReason(): string | undefined {
  if (!process.env.NODE_AUTH_TOKEN) return "NODE_AUTH_TOKEN is not set (the build reads @anvesx/connectors from GitHub Packages)";
  try {
    docker(["info", "--format", "{{.ServerVersion}}"], 15_000);
    return undefined;
  } catch {
    return "the docker daemon is not running (`docker info` failed)";
  }
}

// Build once per test file. The token goes in as a BuildKit secret, never a build-arg, so no layer keeps it.
let built = false;
export function buildImage(): void {
  if (built) return;
  docker(["build", "--secret", "id=npm_token,env=NODE_AUTH_TOKEN", "-t", TAG, "."], 15 * 60_000);
  built = true;
}

/** Start the image detached with the given env; returns the container id and the host port mapped to 8080. */
export function runImage(env: Record<string, string>): { id: string; port: number } {
  const envArgs = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  // host-gateway lets the container reach the throwaway Postgres on this machine (Linux needs it explicitly).
  const id = docker(["run", "-d", "--rm", "-p", "127.0.0.1::8080", "--add-host=host.docker.internal:host-gateway", ...envArgs, TAG]);
  const port = Number(docker(["port", id, "8080/tcp"]).split(":").pop());
  return { id, port };
}

/** `docker image inspect` of the test image, parsed. */
export const inspectImage = (): { Config: { User: string; Env: string[]; Healthcheck?: { Test: string[] } } } =>
  JSON.parse(docker(["image", "inspect", TAG]))[0];

// Stop and remove a container; ignores one that already exited.
export function stopContainer(id: string): void {
  try {
    docker(["rm", "-f", id]);
  } catch {
    // deliberate: the container may already be gone; nothing to clean up
  }
}
