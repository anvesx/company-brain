import type { Acl, Zone } from "@brain/core-types";

export type ListedDoc = {
  address: string;
  title: string;
  version: string;
  acl: Acl;
  zone: Zone;
  updatedAt: string;
};

export type FakeDoc = ListedDoc & { text: string };
export type ConnectorErrorCode = "NOT_FOUND" | "DUPLICATE" | "PATH_ESCAPE" | "BAD_CURSOR" | "FORBIDDEN";

export type Membership = { group: string; user: string };

export interface Connector {
  id: string;
  /** True only when `fetch` really checks `context.token` against the source. A live ACL is meaningless without it. */
  enforcesUserToken?: boolean;
  list(query: { cursor?: string; limit: number }): Promise<{
    items: ListedDoc[];
    nextCursor?: string;
  }>;
  /** Optional metadata-only check that the token's owner can still read `address` at the source. False when the source hides it; throws when it cannot tell. */
  canRead?(address: string, context: { token: string }): Promise<boolean>;
  /** Optional: every (group, user) pair behind the group ids that appear in ACLs. Must be the complete set. */
  listMemberships?(): Promise<Membership[]>;
  fetch(address: string, context: { token: string; signal?: AbortSignal }): Promise<{ text: string; version: string }>;
}

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;

  constructor(code: ConnectorErrorCode, message: string) {
    super(message);
    this.name = "ConnectorError";
    this.code = code;
  }
}
