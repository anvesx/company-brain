import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** The real MCP SDK client over Streamable HTTP, carrying the member's bearer token on every request. */
export async function open(url: string, token: string): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const client = new Client({ name: "brain-mcp-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return { client, transport };
}

export type Result = { isError?: boolean; structuredContent?: Record<string, unknown>; content: unknown[] };

/** Calls one tool and returns the raw result, error results included. */
export const call = async (client: Client, name: string, args: Record<string, unknown> = {}): Promise<Result> =>
  (await client.callTool({ name, arguments: args })) as Result;

/** The structured payload of a successful call; fails the test loudly on an error result. */
export async function data<T = Record<string, unknown>>(client: Client, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await call(client, name, args);
  if (r.isError) throw new Error(`${name} failed: ${JSON.stringify(r.content)}`);
  return r.structuredContent as T;
}

/** A JSON-RPC initialize body, as a raw client would send it. */
export const initialize = (id = 1) => ({
  jsonrpc: "2.0",
  id,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "raw", version: "1" } },
});

/** Headers a Streamable HTTP POST needs; add a bearer and session id when given. */
export const headers = (token?: string, session?: string): Record<string, string> => ({
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
  ...(session ? { "mcp-session-id": session } : {}),
});

/** Token-shaped strings: a JWT, or any 32+ character base64url run. Neither may appear in any output. */
export const TOKEN_SHAPES = [/eyJ[\w-]+\.[\w-]+\.[\w-]+/, /[A-Za-z0-9_-]{32,}/];

/**
 * The token-shaped runs left in `text` once the known public ids (user and organisation ids, which
 * better-auth makes 32 characters long) are removed. An empty list means nothing secret-looking leaked.
 */
export function tokenShapes(text: string, publicIds: string[]): string[] {
  const rest = publicIds.reduce((t, id) => t.split(id).join(" "), text);
  return TOKEN_SHAPES.flatMap((re) => rest.match(new RegExp(re.source, "g")) ?? []);
}
