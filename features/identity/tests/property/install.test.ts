import fc from "fast-check";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall } from "../../src/index.js";

const nameChar = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-");
const name = fc.string({ unit: nameChar, minLength: 1, maxLength: 63 });
const url = fc.webUrl({ validSchemes: ["https"], withQueryParameters: true }).filter((u) => !new URL(u).username && !new URL(u).password);
const client = fc.constantFrom(...INSTALL_CLIENTS);

describe("install renderer properties", () => {
  it("rule 10: any valid manifest renders a body that parses back to its url", () => {
    fc.assert(
      fc.property(name, url, client, (n, u, c) => {
        const out = renderInstall({ name: n, url: u }, c);
        const tree = out.format === "toml" ? parseToml(out.body) : JSON.parse(out.body);
        expect(JSON.stringify(tree)).toContain(JSON.stringify(u).slice(1, -1));
      }),
    );
  });

  it("rule 13: any name with a character outside letters, digits and hyphen is BAD_INPUT naming name", () => {
    const bad = fc.tuple(name, fc.constantFrom("_", " ", ".", "/", "é", '"', "\n"), name).map(([a, x, b]) => `${a}${x}${b}`.slice(0, 63));
    fc.assert(
      fc.property(
        bad.filter((n) => /[^A-Za-z0-9-]/.test(n)),
        client,
        (n, c) => {
          expect(() => renderInstall({ name: n, url: "https://brain.example.com/mcp" }, c)).toThrow(
            expect.objectContaining({ code: "BAD_INPUT", field: "name" }),
          );
        },
      ),
    );
  });

  it("rule 14: rendering twice gives the same result", () => {
    // Block body: an expression body would return the expect() object, which fast-check reads as a failed property.
    fc.assert(
      fc.property(name, url, client, (n, u, c) => {
        expect(renderInstall({ name: n, url: u }, c)).toEqual(renderInstall({ name: n, url: u }, c));
      }),
    );
  });
});
