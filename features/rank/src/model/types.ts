/** What a connector hands to the index. Only `id`, `path`, `mtimeMs`, token counts, ACL rows and link edges are stored. */
export type Doc = {
  id: string;
  title: string;
  path: string;
  body: string;
  /** Who may read it, as opaque strings such as `user:ana`, `team:eng`, `company`. None means nobody. */
  principals: string[];
  mtimeMs: number;
  /** Ids of documents this one links to. */
  links: string[];
};

export type Asker = { principals: string[] };
export type SearchRequest = { query: string; asker: Asker; k?: number };
export type Cols = { title: number; path: number; body: number };

/** `links` is ln(1 + inbound links from documents the asker can read). */
export type Signals = { text: number; recency: number; links: number };

/** A pointer: where the document is and why it ranked. Never any text. */
export type Hit = { id: string; path: string; score: number; signals: Signals };

export type Probe = (stage: string, ms: number) => void;
export type OpenOptions = { now?: () => number; weights?: Cols };
