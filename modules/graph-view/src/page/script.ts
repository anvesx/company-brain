import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Order matters: later files use what earlier ones declare. They share one scope, so they are joined, not imported. */
const PARTS = ["state.js", "graph.js", "panel.js", "main.js"];

/**
 * The page script served at `/graph.js`: the plain browser files of `script/` joined into one classic script,
 * read once when the routes are mounted. The file list is fixed, so no request chooses a path.
 */
export const pageScript = (): string => PARTS.map((name) => readFileSync(fileURLToPath(new URL(`./script/${name}`, import.meta.url)), "utf8")).join("\n");
