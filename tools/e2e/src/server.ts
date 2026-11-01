import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type Server = { url: string; stop: () => Promise<number | null> };

const bin = resolve(import.meta.dirname, "../../../apps/brain/dist/bin.js");

export const startServer = (): Promise<Server> =>
  new Promise((done, fail) => {
    const dir = mkdtempSync(join(tmpdir(), "brain-e2e-"));
    const env = { ...process.env, BRAIN_DEMO: "1", BRAIN_PORT: "0", BRAIN_AUDIT_DB: join(dir, "audit.db"), BRAIN_ANCHOR: join(dir, "anchor") };
    const child: ChildProcess = spawn("node", [bin], { env });
    const timer = setTimeout(() => fail(new Error("brain did not start in 10s")), 10_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      const url = /listening on (http:\/\/\S+)/.exec(chunk.toString())?.[1];
      if (!url) return;
      clearTimeout(timer);
      const exited = new Promise<number | null>((ok) => child.once("exit", (code) => ok(code)));
      done({
        url,
        stop: () => {
          child.kill("SIGTERM");
          return exited;
        },
      });
    });
    child.once("exit", (code) => fail(new Error(`brain exited early with ${code}`)));
  });
