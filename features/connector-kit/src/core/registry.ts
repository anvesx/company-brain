import { type Connector, ConnectorError } from "./contract.js";

export type ConnectorRegistry = {
  register(connector: Connector): void;
  get(id: string): Connector;
};

export const createConnectorRegistry = (): ConnectorRegistry => {
  const connectors = new Map<string, Connector>();
  return {
    register(connector) {
      if (connectors.has(connector.id)) {
        throw new ConnectorError("DUPLICATE", `Connector already registered: ${connector.id}`);
      }
      connectors.set(connector.id, connector);
    },
    get(id) {
      const connector = connectors.get(id);
      if (connector === undefined) {
        throw new ConnectorError("NOT_FOUND", `Connector not found: ${id}`);
      }
      return connector;
    },
  };
};
