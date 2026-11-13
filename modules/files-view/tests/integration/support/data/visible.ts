export const OWNERS = ["alice", "bob", "carol"];
const zoneOk = (user: string, i: number): boolean => (i % 10 === 0 ? user === "alice" : i % 10 === 5 ? OWNERS[i % 3] === user : true);
const reads: Record<string, (i: number) => boolean> = {
  alice: (i) => i % 2 === 0 || i % 5 === 0,
  bob: (i) => i % 3 === 0,
  carol: (i) => i % 7 === 0,
};
/** The t1 file indexes a viewer may see, worked out by hand from the seed above. */
export const visibleIdx = (user: "alice" | "bob" | "carol"): number[] =>
  Array.from({ length: 500 }, (_, i) => i).filter((i) => (reads[user] as (i: number) => boolean)(i) && zoneOk(user, i));
export const ownerOf = (i: number): string => OWNERS[i % 3] as string;
