import { cpus, loadavg } from "node:os";
import { edge, node } from "../support/graph.js";
import type { BrainEnv } from "../support/server.js";
import type { Member } from "../support/users.js";

// Shared by the scale tests. One tenant: 99,730 documents, 200 people, 20 teams, 50 projects.
export const WORDS = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa".split(" ");
export const DOCS = 99_730;

/** Seeds the 100k graph. `teams` lists, per person, the teams they join: Ada [0,1], Eve [2,3], Zed none (reads nothing). */
export async function seed(env: BrainEnv, people: Record<string, { member: Member; teams: number[] }>): Promise<void> {
  const t = Object.values(people)[0]?.member.tenant ?? "";
  for (const [name, { member, teams }] of Object.entries(people)) {
    node(env.store, t, member.userId, "person", name);
    for (const k of teams) edge(env.store, t, member.userId, "member-of", `team-${k}`);
  }
  for (let p = 1; p < 200 - Object.keys(people).length; p++) node(env.store, t, `person-${p}`, "person", `Person ${p}`);
  for (let k = 0; k < 20; k++) node(env.store, t, `team-${k}`, "team", `Team ${k}`);
  for (let j = 0; j < 50; j++) node(env.store, t, `proj-${j}`, "project", `Project ${j}`);
  for (let i = 0; i < DOCS; i++) {
    const id = `doc-${String(i).padStart(6, "0")}`;
    node(env.store, t, id, "document", `${WORDS[i % 16]} ${WORDS[(i * 7) % 16]} report ${i}`);
    edge(env.store, t, `team-${i % 20}`, "can-read", id);
    edge(env.store, t, id, "belongs-to", `proj-${i % 50}`);
    // Seeding is synchronous: hand the event loop back so the server and its keep-alive sockets keep their timers.
    if (i % 1_000 === 999) await new Promise((resolve) => setImmediate(resolve));
  }
}

export const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

/**
 * A wall-clock budget is only meaningful on a quiet machine. Always print the numbers; when the 1-minute load
 * average is above the CPU count, print SKIPPED and do not assert (the run says so, it never silently passes).
 */
export function budget(label: string, took: number[], limitMs: number, p = 99): boolean {
  took.sort((a, b) => a - b);
  const load = loadavg()[0] ?? 0;
  const busy = load > cpus().length;
  const got = pct(took, p);
  console.log(
    `${label}: p50 ${pct(took, 50).toFixed(2)} ms, p${p} ${got.toFixed(2)} ms, max ${(took[took.length - 1] ?? 0).toFixed(2)} ms, load ${load.toFixed(1)}/${cpus().length} cpus${busy ? ` SKIPPED wall assertion (< ${limitMs} ms)` : ""}`,
  );
  if (!busy && got >= limitMs) throw new Error(`${label}: p${p} ${got.toFixed(2)} ms is not under ${limitMs} ms`);
  return !busy;
}
