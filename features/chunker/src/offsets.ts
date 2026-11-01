import { ChunkError } from "./errors.js";

export type Located = { text: string; start: number; end: number };

const blank = (s: string) => s.trim() === "";

/**
 * Places the library's ordered pieces in the source text. The library trims
 * whitespace, so a piece can only be recovered by search. A valid placement has
 * these properties, which the library guarantees for its own output:
 * starts and ends never decrease, and the text between two pieces (and before the
 * first and after the last) is whitespace only. The search is a depth-first
 * backtracking over candidate occurrences with a memo of dead (piece, start) states,
 * so it is complete: if the pieces came from the text, a placement is found.
 * OFFSET_LOST is an internal-invariant error for pieces that cannot be placed.
 */
export function locate(text: string, pieces: readonly string[]): Located[] {
  const n = pieces.length;
  if (n === 0) return [];
  if (pieces.some((p) => p.length === 0)) throw lost(pieces.findIndex((p) => p.length === 0));
  const starts: number[] = new Array<number>(n).fill(0);
  const from: number[] = new Array<number>(n).fill(0);
  const dead = new Set<string>();
  let i = 0;
  let deepest = 0;
  while (i >= 0) {
    const piece = pieces[i] as string;
    const prevStart = i === 0 ? 0 : (starts[i - 1] as number);
    const prevEnd = i === 0 ? 0 : prevStart + (pieces[i - 1] as string).length;
    const at = nextCandidate(text, piece, from[i] as number, prevStart, prevEnd, i === 0, (s) =>
      dead.has(`${i}:${s}`),
    );
    if (at < 0 || (i === n - 1 && !blank(text.slice(at + piece.length)))) {
      if (at >= 0) {
        from[i] = at + 1;
        continue;
      }
      i--;
      if (i >= 0) dead.add(`${i}:${starts[i]}`);
      continue;
    }
    starts[i] = at;
    from[i] = at + 1;
    deepest = Math.max(deepest, i);
    if (i === n - 1) break;
    i++;
    from[i] = at;
  }
  if (i < 0) throw lost(deepest + 1);
  return pieces.map((p, k) => ({ text: p, start: starts[k] as number, end: (starts[k] as number) + p.length }));
}

const lost = (k: number) => new ChunkError("OFFSET_LOST", `piece ${k} cannot be located in source text`);

/** Next occurrence at or after `from` that keeps the placement valid, or -1. */
function nextCandidate(
  text: string,
  piece: string,
  from: number,
  prevStart: number,
  prevEnd: number,
  first: boolean,
  isDead: (start: number) => boolean,
): number {
  for (let at = text.indexOf(piece, from); at >= 0; at = text.indexOf(piece, at + 1)) {
    if (at > prevEnd && !blank(text.slice(prevEnd, at))) return -1;
    if (first && at > 0 && !blank(text.slice(0, at))) return -1;
    if (at >= prevStart && at + piece.length >= prevEnd && !isDead(at)) return at;
  }
  return -1;
}
