/** The kind of document a source is. Each class starts with a prior accuracy (spec rule 1). */
export type SourceClass = "signed" | "record" | "wiki" | "ticket" | "chat" | "draft" | "opinion" | "news";
/** A feed or author that makes claims. `id` is unique across the call. */
export interface Source {
  id: string;
  class: SourceClass;
}
/** One assertion by one source: "for item X the value is V", made at time `at` (ms since epoch). */
export interface Claim {
  id: string;
  source: string;
  item: string;
  value: string;
  at: number;
}
/** Caller-known copying: `copier` repeats `share` (0..1) of `original`'s values. */
export interface CopyEdge {
  copier: string;
  original: string;
  share: number;
}
/** A person settled an item. Resolved truths re-score every source that disagreed. */
export type Correction = Pick<Claim, "item" | "value" | "at">;
/** Knobs for one call. Only `now` is required; nothing reads the system clock. */
export interface TrustOptions {
  now: number; // Injected clock, ms since epoch. Used only for vote decay.
  priors?: Partial<Record<SourceClass, number>>; // Override the class priors, each in the open interval (0, 1).
  minClaims?: number; // Below this many claims a source keeps its prior. Default 5.
  maxRounds?: number; // Hard cap on vote-then-accuracy rounds. Default 20.
  epsilon?: number; // Convergence and tie threshold. Default 1e-6.
  halfLifeMs?: number; // Vote decay half life. Omitted means no decay.
}
/** Everything the caller knows. `copies` and `corrections` default to empty. */
export interface TrustInput {
  sources: Source[];
  claims: Claim[];
  copies?: CopyEdge[];
  corrections?: Correction[];
}
/** All claims for one value of one item. `score` is C(v), `confidence` is P(v). */
export interface ValueGroup {
  value: string;
  score: number;
  confidence: number;
  sources: string[];
  newestAt: number;
}
/** The verdict for one item. `value` is the winner; `groups` lists every side, best first. */
export interface Resolution {
  item: string;
  value: string | null;
  confidence: number;
  groups: ValueGroup[];
  tie: boolean;
  corrected: boolean;
}
/** Learned trust for one source. `learned` is false when it kept its prior. */
export interface SourceScore {
  source: string;
  accuracy: number;
  claims: number;
  learned: boolean;
}
/** Output of resolveClaims. `converged` is false when maxRounds stopped the loop. */
export interface TrustResult {
  sources: SourceScore[];
  items: Resolution[];
  rounds: number;
  converged: boolean;
}
/** What labelPassages needs from a passage. Extra fields pass through untouched. */
export interface PassageRef {
  source: string;
  item?: string;
  value?: string;
}
/** A passage with its source's trust and which side of the item it is on. */
export type LabelledPassage<T extends PassageRef> = T & { trust: number; group: "best" | "other" | "unresolved" };
