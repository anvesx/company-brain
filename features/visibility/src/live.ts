/** Who is asking: the tenant and user identity vouched for. */
export type Caller = { user: string; tenant: string };
/** A graph node, as the gate and the source check see it (structurally `GraphNode`). */
export type Doc = {
  tenant: string;
  id: string;
  kind: "person" | "team" | "document" | "repo" | "channel" | "ticket" | "project";
  source: string;
  address: string;
  title: string;
  version: string;
  props: Record<string, string>;
};

/** Asks the source whether `caller` can still read `doc` right now. Throwing or returning false hides the document. */
export type Recheck = (doc: Doc, caller: Caller) => Promise<boolean>;

export interface RecheckLimits {
  /** Longest one check may take before that document is hidden. */
  perCheckMs: number;
  /** Longest the whole list may take; documents still unanswered are hidden. */
  totalMs: number;
  /** Most documents checked, and so most returned. */
  top: number;
}
export const DEFAULT_LIMITS: RecheckLimits = { perCheckMs: 800, totalMs: 1200, top: 10 };

const within = <T>(p: Promise<T>, ms: number, otherwise: T): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<T>((ok) => {
    timer = setTimeout(() => ok(otherwise), ms);
  });
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
};

/** Keeps the documents that pass the live check. Fails closed: a rejected, late, thrown or unasked check hides that document. */
export async function stillReadable(docs: Doc[], caller: Caller, check?: Recheck, limits: RecheckLimits = DEFAULT_LIMITS): Promise<Doc[]> {
  if (check === undefined) return [];
  const asked = docs.slice(0, limits.top);
  const each = asked.map((d) =>
    within(
      Promise.resolve()
        .then(() => check(d, caller))
        .catch(() => false),
      limits.perCheckMs,
      false,
    ),
  );
  const ok = await within(
    Promise.all(each),
    limits.totalMs,
    asked.map(() => false),
  );
  return asked.filter((_, i) => ok[i]);
}
