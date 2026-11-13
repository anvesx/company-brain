import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));

describe("the source has no password, email-password or passkey path", () => {
  test("no source file mentions them or turns them on", () => {
    const hits = sources(join(root, "src")).filter((f) =>
      /password|passkey|webauthn|emailAndPassword:\s*\{\s*enabled:\s*true/i.test(
        readFileSync(f, "utf8").replace(/emailAndPassword: \{ enabled: false \}/g, ""),
      ),
    );
    expect(hits).toEqual([]);
  });
  test("package.json depends on no passkey, webauthn or password-strength library", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).filter((d) => /passkey|webauthn|zxcvbn|bcrypt|argon|scrypt/i.test(d))).toEqual([]);
  });
});
