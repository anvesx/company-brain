import { type Connector, ConnectorError, type FakeDoc, type ListedDoc } from "../../src/core/contract.js";
import { pageItems } from "../../src/core/paging.js";

export type { FakeDoc };

export const createFakeConnector = (id: string, docs: FakeDoc[]): Connector => {
  const stored = docs.map((doc) => ({ ...doc, acl: { ...doc.acl } }));
  const byAddress = new Map<string, FakeDoc>();
  for (const doc of stored) {
    if (byAddress.has(doc.address)) {
      throw new ConnectorError("DUPLICATE", `Duplicate document address: ${doc.address}`);
    }
    byAddress.set(doc.address, doc);
  }
  const listed: ListedDoc[] = stored.map(({ text: _text, ...metadata }) => metadata);
  return {
    id,
    enforcesUserToken: false,
    async list(query) {
      return pageItems(listed, query);
    },
    async fetch(address) {
      const doc = byAddress.get(address);
      if (doc === undefined) throw new ConnectorError("NOT_FOUND", `Document not found: ${address}`);
      return { text: doc.text, version: doc.version };
    },
  };
};
