import { mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

describe("folder connector document version", () => {
  it("a same-size edit with a restored mtime still changes the version", async () => {
    const root = await mkdtemp(join(tmpdir(), "connector-kit-"));
    const path = join(root, "note.txt");
    const fixed = new Date("2026-01-01T00:00:00Z");
    await writeFile(path, "one");
    await utimes(path, fixed, fixed);
    const connector = createFolderConnector("folder", root);
    const before = (await connector.list({ limit: 1 })).items[0];
    await writeFile(path, "two");
    await utimes(path, fixed, fixed);
    const after = (await connector.list({ limit: 1 })).items[0];
    expect(after?.version).not.toBe(before?.version);
    await expect(connector.fetch("note.txt", { token: "user" })).resolves.toEqual({ text: "two", version: after?.version });
  });
});
