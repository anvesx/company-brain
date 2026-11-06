import { GraphError } from "@anvesx/graph-store";
import { IdentityError } from "@anvesx/identity";
import { describe, expect, it } from "vitest";
import { ToolFailure, toToolResult } from "../../src/server/errors.js";

// Every failure a tool can hit becomes an MCP result with isError set, a text line "<CODE>: <message>"
// and structuredContent { code, message }. The client branches on code, never on the text.
const CODES = ["NOT_FOUND", "INVALID_ARGUMENT", "UNAUTHENTICATED", "INTERNAL"];

describe("error mapping", () => {
  it("passes a ToolFailure through with its own code and message", () => {
    const r = toToolResult(new ToolFailure("NOT_FOUND", "no node doc-1"));
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toEqual({ code: "NOT_FOUND", message: "no node doc-1" });
    expect(r.content).toEqual([{ type: "text", text: "NOT_FOUND: no node doc-1" }]);
  });

  it("maps a store BAD_INPUT to INVALID_ARGUMENT and keeps the store's message", () => {
    const r = toToolResult(new GraphError("BAD_INPUT", "id must be a non-empty string"));
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toEqual({ code: "INVALID_ARGUMENT", message: "id must be a non-empty string" });
  });

  it("maps any identity failure to UNAUTHENTICATED", () => {
    for (const code of ["EXPIRED", "WRONG_AUDIENCE", "UNAUTHENTICATED"] as const) {
      const r = toToolResult(new IdentityError(code, "the access token is not valid here"));
      expect(r.isError).toBe(true);
      expect(r.structuredContent).toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  it("hides the message of anything unexpected behind INTERNAL", () => {
    const leak = "sqlite says: refresh_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLXNlY3JldA";
    for (const e of [new Error(leak), new GraphError("CLOSED", leak), leak, { leak }, undefined]) {
      const r = toToolResult(e);
      expect(r.isError).toBe(true);
      expect(r.structuredContent).toEqual({ code: "INTERNAL", message: "internal error" });
      expect(r.content).toEqual([{ type: "text", text: "INTERNAL: internal error" }]);
      expect(JSON.stringify(r)).not.toContain("eyJ");
    }
  });

  it("never emits a code outside the four", () => {
    const inputs = [new ToolFailure("INVALID_ARGUMENT", "x"), new GraphError("DEPTH_LIMIT", "x"), new Error("x")];
    for (const e of inputs) expect(CODES).toContain((toToolResult(e).structuredContent as { code: string }).code);
  });

  it("refuses to build a ToolFailure with an unknown code", () => {
    expect(() => new ToolFailure("FORBIDDEN" as never, "x")).toThrow();
  });
});
