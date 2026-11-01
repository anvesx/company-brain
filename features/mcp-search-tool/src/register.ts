import type { Pointer, Principal } from "@brain/core-types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResults } from "./format.js";
import { SearchInputSchema } from "./schema.js";

export type SearchFn = (query: {
	query: string;
	limit: number;
	principal: Principal;
}) => Promise<Pointer[]>;

export type SearchDependencies = {
	search: SearchFn;
	principalFor: (extra: unknown) => Principal;
};

export function registerSearchTool(
	server: McpServer,
	deps: SearchDependencies,
): void {
	server.registerTool(
		"search",
		{
			description: "Find knowledge pointers without returning document bodies.",
			inputSchema: SearchInputSchema,
		},
		async ({ query, limit }, extra) => {
			try {
				const principal = deps.principalFor(extra);
				const pointers = await deps.search({ query, limit, principal });
				return {
					content: [{ type: "text" as const, text: formatResults(pointers) }],
				};
			} catch {
				return {
					isError: true,
					content: [{ type: "text" as const, text: "Search failed" }],
				};
			}
		},
	);
}
