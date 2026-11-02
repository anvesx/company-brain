import type { Ctx } from "../../../src/write/document.js";
import { setup } from "../../helpers.js";

/** A run context on a fresh temp graph, with no clock checks, for calling the write steps directly. */
export const ctxOf = (s = setup()): Ctx => ({
  deps: s.deps,
  report: { nodes: 0, edges: 0, removed: 0, pages: 0, skipped: [] },
  alive: () => {},
  principals: new Map(),
  root: "connector:folder",
});
