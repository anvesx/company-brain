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
export type ConnectorErrorCode = "NOT_FOUND" | "DUPLICATE" | "PATH_ESCAPE" | "BAD_CURSOR";

export interface Connector {
  id: string;
  list(query: { cursor?: string; limit: number }): Promise<{
    items: ListedDoc[];
    nextCursor?: string;
  }>;
  fetch(address: string, context: { token: string }): Promise<{ text: string; version: string }>;
}

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;

  constructor(code: ConnectorErrorCode, message: string) {
    super(message);
    this.name = "ConnectorError";
    this.code = code;
  }
}
