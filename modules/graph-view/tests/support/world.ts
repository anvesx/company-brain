import type { GraphStore } from "@anvesx/graph-store";
import { edge, node, write } from "./store.js";

/** The time every row of the small world is written at. */
export const T0 = 1_000;

/**
 * A small company in tenant "t1", plus one row in tenant "t2" that shares an id with t1.
 *
 *   alice -member-of-> eng            eng, bob   -can-read-> d-shared (gdrive)
 *   alice -can-read->  d-alice (notion)          bob -can-read-> d-bob (gdrive)
 *   carol -can-read->  d-secret (github)         d-shared -belongs-to-> p-launch
 *   d-alice -belongs-to-> r-api, d-secret        d-bob -belongs-to-> p-hidden
 *   d-alice -links-to-> d-shared -links-to-> d-bob
 *   alice -authored-> d-alice, bob -authored-> d-bob, carol -mentions-> d-shared
 */
export function seedWorld(store: GraphStore): void {
  const t = "t1";
  write(
    store,
    T0,
    [
      node(t, "alice", "person", "slack"),
      node(t, "bob", "person", "slack"),
      node(t, "carol", "person", "slack"),
      node(t, "eng", "team", "slack"),
      node(t, "d-shared", "document", "gdrive"),
      node(t, "d-alice", "document", "notion"),
      node(t, "d-bob", "document", "gdrive"),
      node(t, "d-secret", "document", "github"),
      node(t, "p-launch", "project", "linear"),
      node(t, "p-hidden", "project", "linear"),
      node(t, "r-api", "repo", "github"),
      node("t2", "d-alice", "document", "notion", { title: "Other tenant" }),
    ],
    [
      edge(t, "alice", "eng", "member-of"),
      edge(t, "eng", "d-shared", "can-read"),
      edge(t, "bob", "d-shared", "can-read"),
      edge(t, "alice", "d-alice", "can-read"),
      edge(t, "bob", "d-bob", "can-read"),
      edge(t, "carol", "d-secret", "can-read"),
      edge(t, "d-shared", "p-launch", "belongs-to"),
      edge(t, "d-alice", "r-api", "belongs-to"),
      edge(t, "d-alice", "d-secret", "belongs-to"),
      edge(t, "d-bob", "p-hidden", "belongs-to"),
      edge(t, "d-alice", "d-shared", "links-to"),
      edge(t, "d-shared", "d-bob", "links-to"),
      edge(t, "alice", "d-alice", "authored"),
      edge(t, "bob", "d-bob", "authored"),
      edge(t, "carol", "d-shared", "mentions"),
      edge("t2", "alice", "d-alice", "can-read"),
    ],
  );
}

/** What alice may see, worked out by hand from the picture above. */
export const ALICE_NODES = ["alice", "bob", "d-alice", "d-shared", "eng", "p-launch", "r-api"];
export const ALICE_EDGES = [
  "alice -authored-> d-alice",
  "alice -can-read-> d-alice",
  "alice -member-of-> eng",
  "bob -can-read-> d-shared",
  "d-alice -belongs-to-> r-api",
  "d-alice -links-to-> d-shared",
  "d-shared -belongs-to-> p-launch",
  "eng -can-read-> d-shared",
];

/** What bob may see. alice is absent: she reads d-shared only through eng, she has no can-read edge herself. */
export const BOB_NODES = ["bob", "d-bob", "d-shared", "eng", "p-hidden", "p-launch"];
export const BOB_EDGES = [
  "bob -authored-> d-bob",
  "bob -can-read-> d-bob",
  "bob -can-read-> d-shared",
  "d-bob -belongs-to-> p-hidden",
  "d-shared -belongs-to-> p-launch",
  "d-shared -links-to-> d-bob",
  "eng -can-read-> d-shared",
];
