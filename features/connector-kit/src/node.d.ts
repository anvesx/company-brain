declare module "node:crypto" {
  type Hash = { update(text: string): Hash; digest(encoding: "hex"): string };
  export function createHash(algorithm: "sha256"): Hash;
}

declare module "node:fs/promises" {
  type Stats = {
    mtime: Date; mtimeMs: number; size: number;
    isDirectory(): boolean; isFile(): boolean;
  };
  type Dirent = { name: string; isDirectory(): boolean; isFile(): boolean };
  export function lstat(path: string): Promise<Stats>;
  export function stat(path: string): Promise<Stats>;
  export function realpath(path: string): Promise<string>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function mkdir(path: string): Promise<void>;
  export function symlink(target: string, path: string): Promise<void>;
  export function writeFile(path: string, data: string): Promise<void>;
}

declare module "node:path" {
  export const sep: string;
  export function basename(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}

declare module "node:os" { export function tmpdir(): string; }
declare module "node:perf_hooks" { export const performance: { now(): number }; }
