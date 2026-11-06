/** One template per client: where its config file lives, its format, the server entry and the fields the vendor docs did not confirm. */
export const INSTALL_CLIENTS = ["claude-code", "codex", "cursor", "gemini-cli", "claude-desktop", "kiro", "antigravity"] as const;

export type InstallClient = (typeof INSTALL_CLIENTS)[number];

export interface InstallTemplate {
  readonly format: "json" | "toml";
  readonly path: string;
  /** The JSON object that sits under `mcpServers.<name>` (or the TOML table `mcp_servers.<name>`). */
  readonly entry: (url: string) => Record<string, unknown>;
  /** Field names to flag with "check current docs". Claude Code is the only client whose fields were confirmed. */
  readonly unconfirmed: readonly string[];
}

export const TEMPLATES: Readonly<Record<InstallClient, InstallTemplate>> = {
  "claude-code": { format: "json", path: ".mcp.json", entry: (url) => ({ type: "http", url }), unconfirmed: [] },
  codex: { format: "toml", path: "~/.codex/config.toml", entry: (url) => ({ url }), unconfirmed: ["url"] },
  cursor: { format: "json", path: "~/.cursor/mcp.json", entry: (url) => ({ url }), unconfirmed: ["url"] },
  "gemini-cli": { format: "json", path: "~/.gemini/settings.json", entry: (url) => ({ httpUrl: url }), unconfirmed: ["httpUrl"] },
  "claude-desktop": {
    format: "json",
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
    entry: (url) => ({ command: "npx", args: ["-y", "mcp-remote", url] }),
    unconfirmed: ["command", "args"],
  },
  // Shapes read back from `kiro-cli mcp add --scope workspace` and `agy mcp add --type http`.
  kiro: { format: "json", path: ".kiro/settings/mcp.json", entry: (url) => ({ url }), unconfirmed: ["url"] },
  antigravity: { format: "json", path: "~/.gemini/config/mcp_config.json", entry: (url) => ({ serverUrl: url }), unconfirmed: ["serverUrl"] },
};
