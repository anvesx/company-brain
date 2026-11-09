/** Who opened a session. A session is only ever handed back to this exact user in this tenant. */
export interface Owner {
  user: string;
  tenant: string;
}
/** The one thing the store needs from a transport: a way to shut it. */
interface Closable {
  close(): Promise<void>;
}

export const DEFAULT_SESSION_CAP = 10_000;

/** In-memory sessions, owner-bound, capped, least recently used out first. */
export function createSessions<T extends Closable>(cap = DEFAULT_SESSION_CAP) {
  if (!Number.isInteger(cap) || cap < 1) throw new RangeError("session cap must be a positive whole number");
  // A Map iterates in insertion order, so the first key is the least recently used one.
  const live = new Map<string, { owner: Owner; transport: T }>();
  const drop = (id: string): boolean => {
    const entry = live.get(id);
    if (entry === undefined) return false;
    live.delete(id); // remove first: closing calls back into delete, which must find nothing
    void entry.transport.close();
    return true;
  };
  return {
    cap,
    add(id: string, owner: Owner, transport: T): void {
      while (live.size >= cap) drop(live.keys().next().value as string);
      live.set(id, { owner, transport });
    },
    /** The transport, or undefined for an unknown id or someone else's session. A miss is not a use. */
    get(id: string, owner: Owner): T | undefined {
      const entry = live.get(id);
      if (entry === undefined || entry.owner.user !== owner.user || entry.owner.tenant !== owner.tenant) return undefined;
      live.delete(id);
      live.set(id, entry); // move to the most recently used end
      return entry.transport;
    },
    delete: drop,
    size: (): number => live.size,
  };
}
