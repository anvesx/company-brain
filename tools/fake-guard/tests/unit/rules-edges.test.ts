import { describe, expect, it } from "vitest";
import { compare } from "../../src/baseline.ts";
import { scanFile } from "../../src/rules.ts";

const MOCK = `vi${"."}mock("x")`;
const rules = (file: string, text: string) => scanFile(file, text).map((f) => f.rule);

describe("scanFile scoping", () => {
  it("ignores fake names and exports outside src", () => {
    expect(rules("/features/a/tests/fake.ts", "export const makeFakeStore = 1")).toEqual([]);
    expect(rules("/features/a/other/x.ts", "export const makeFakeStore = 1")).toEqual([]);
  });
  it("ignores module mocking outside tests", () => {
    expect(rules("/features/a/src/x.ts", MOCK)).toEqual([]);
    expect(rules("/features/a/other/x.ts", MOCK)).toEqual([]);
  });
  it("reports the one-based line of each hit", () => {
    const text = "ok\nexport function stubIt() {}\nok\nexport class MockThing {}";
    expect(scanFile("/p/src/x.ts", text).map((f) => f.line)).toEqual([2, 4]);
  });
});

describe("scanFile patterns", () => {
  it("matches an export with extra whitespace or a bare keyword name", () => {
    expect(rules("/p/src/x.ts", "export  const  fake = 1")).toEqual(["src-ships-fake"]);
    expect(rules("/p/src/x.ts", "export const fake")).toEqual(["src-ships-fake"]);
    expect(rules("/p/src/x.ts", "export function myStub() {}")).toEqual(["src-ships-fake"]);
  });
  it("matches a fake word that is embedded in a longer identifier in real tiers", () => {
    expect(rules("/p/tests/e2e/x.test.ts", "const myfakeClock = 1")).toEqual(["fake-in-real-tier"]);
    expect(rules("/p/tests/scale/x.test.ts", "const clockStub = 1")).toEqual(["fake-in-real-tier"]);
  });
});

describe("compare ordering", () => {
  it("returns problems sorted", () => {
    const f = (file: string) => ({ file, rule: "r", line: 1 });
    expect(compare([f("b"), f("a")], { "z:r": 1 })).toEqual(["new: a:r x1", "new: b:r x1", "stale baseline, remove or lower: z:r"]);
  });
});
