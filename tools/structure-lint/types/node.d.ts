declare module "node:fs" {
  export interface Dirent { name: string; isDirectory(): boolean; isFile(): boolean }
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function rmSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string): void;
}
declare module "node:path" {
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}
declare module "node:os" { export function tmpdir(): string }
declare module "node:child_process" {
  export type Result = { status: number | null; stdout: string; stderr: string };
  export function spawnSync(command: string, args: string[], options: { encoding: "utf8" }): Result;
  export function execFile(command: string, args: string[], options: { encoding: "utf8" },
    callback: (error: Error | null, stdout: string, stderr: string) => void): void;
}
declare module "node:util" {
  export function promisify(fn: typeof import("node:child_process").execFile):
    (command: string, args: string[], options: { encoding: "utf8" }) =>
      Promise<{ stdout: string; stderr: string }>;
}
declare const process: { execPath: string };
