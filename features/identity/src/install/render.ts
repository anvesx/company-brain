import { parse as parseToml } from "smol-toml";
import { IdentityError, InstallRenderError } from "../errors.js";
import { INSTALL_CLIENTS, type InstallClient, type InstallTemplate, TEMPLATES } from "./templates.js";
import { httpsOrLoopback, parseUrl } from "./url.js";

export { INSTALL_CLIENTS, type InstallClient, type InstallTemplate, TEMPLATES };

export interface InstallManifest {
  name: string;
  url: string;
}

export interface InstallOutput {
  client: InstallClient;
  format: "json" | "toml";
  path: string;
  body: string;
  command: string | null;
  notes: string[];
}

const NAME = /^[A-Za-z0-9-]{1,63}$/;

/** https anywhere or http on loopback (local development), and no user:password in it. */
const isGoodUrl = (text: string): boolean => httpsOrLoopback(text) && parseUrl(text)?.username === "" && parseUrl(text)?.password === "";

/** Wrap text in single quotes for a POSIX shell. A single quote inside becomes '\'' (close, escaped quote, reopen). */
const shellQuote = (text: string): string => `'${text.replaceAll("'", "'\\''")}'`;

/** Turn a server entry into a TOML table. Only strings are needed, and a JSON quoted string is a valid TOML basic string. */
const toml = (name: string, entry: Record<string, unknown>): string =>
  `[mcp_servers.${name}]\n${Object.entries(entry)
    .map(([key, value]) => `${key} = ${JSON.stringify(value)}\n`)
    .join("")}`;

/** Parse the file back and check the server sits under its name. Anything else means a half-rendered snippet. */
const checkParses = (client: InstallClient, format: "json" | "toml", body: string, name: string): void => {
  try {
    const tree = (format === "toml" ? parseToml(body) : JSON.parse(body)) as Record<string, Record<string, unknown> | undefined>;
    if (!(tree[format === "toml" ? "mcp_servers" : "mcpServers"]?.[name] ?? null)) throw new Error(`no server named ${name}`);
  } catch (error) {
    throw new InstallRenderError(client, error instanceof Error ? error.message : String(error));
  }
};

/** Render the config snippet for one client, parse it back, and return it. Pure: the same input always gives the same output. */
export const renderInstall = (
  manifest: InstallManifest,
  client: InstallClient,
  templates: Readonly<Record<InstallClient, InstallTemplate>> = TEMPLATES,
): InstallOutput => {
  const template = (templates as Record<string, InstallTemplate | undefined>)[client];
  if (!Object.hasOwn(templates, client) || template === undefined) throw new IdentityError("BAD_INPUT", `unknown client ${String(client)}`, "client");
  if (!NAME.test(manifest.name)) throw new IdentityError("BAD_INPUT", "use 1 to 63 letters, digits or hyphens", "name");
  if (!isGoodUrl(manifest.url)) throw new IdentityError("BAD_INPUT", "must be https (http only on localhost) without credentials", "url");
  const entry = template.entry(manifest.url);
  const body = template.format === "toml" ? toml(manifest.name, entry) : `${JSON.stringify({ mcpServers: { [manifest.name]: entry } }, null, 2)}\n`;
  checkParses(client, template.format, body, manifest.name);
  return {
    client,
    format: template.format,
    path: template.path,
    body,
    command: client === "claude-code" ? `claude mcp add --transport http ${shellQuote(manifest.name)} ${shellQuote(manifest.url)}` : null,
    notes: template.unconfirmed.map((field) => `${field}: check current docs`),
  };
};
