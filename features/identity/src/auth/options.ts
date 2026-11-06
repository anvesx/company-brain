import { passkey } from "@better-auth/passkey";
import { type AuthContext, type BetterAuthOptions, betterAuth, getCurrentAdapter } from "better-auth";
import { jwt, organization } from "better-auth/plugins";
import type { ResolvedConfig } from "../config.js";
import { hitsPlugin, identityHooks } from "./hooks.js";
import { mcpPlugin } from "./mcp.js";

const DAY = 86_400;

/** The slice of better-auth this package uses. Naming it keeps the plugin types out of our public signatures. */
export interface Auth {
  handler: (req: Request) => Promise<Response>;
  api: {
    getSession: (ctx: { headers: Headers }) => Promise<{ user: { id: string }; session: { id: string } } | null>;
    listOrganizations: (ctx: { headers: Headers }) => Promise<{ id: string }[]>;
    createOrganization: (ctx: { body: { name: string; slug: string; userId: string } }) => Promise<{ id: string } | null>;
  };
  $context: Promise<{ adapter: unknown }>;
  options: BetterAuthOptions;
}

/** Build the one better-auth instance: email and password, organizations, signed JWTs and the MCP OAuth provider. */
/**
 * Every better-auth option. `auth` is read lazily by the hooks, so these options exist before better-auth boots:
 * that lets `migrateDatabase` create the tables first, and keeps better-auth's start-up schema check quiet.
 */
export const authOptions = (cfg: ResolvedConfig, auth: () => Auth): BetterAuthOptions => {
  // The hooks run later, when `auth` exists. Inside a transaction this returns the transaction's adapter,
  // because SQLite has one connection and a second adapter would wait forever for it.
  const adapter = async (): Promise<AuthContext["adapter"]> =>
    getCurrentAdapter(((await auth().$context) as unknown as AuthContext).adapter) as unknown as AuthContext["adapter"];

  return {
    baseURL: cfg.baseUrl,
    secret: cfg.secret,
    database: cfg.database,
    trustedOrigins: [new URL(cfg.baseUrl).origin],
    logger: { level: "error" },
    // Our own limits (src/guard/limits.ts) replace better-auth's in-memory limiter, which does not survive a restart.
    rateLimit: { enabled: false },
    // Length is counted in code points by our own check, so better-auth's UTF-16 limits are set out of the way.
    // Password hashing is better-auth's own default (scrypt); there is no override.
    emailAndPassword: { enabled: true, minPasswordLength: 1, maxPasswordLength: 4096, autoSignIn: true },
    session: { expiresIn: 7 * DAY },
    databaseHooks: identityHooks(auth, adapter),
    plugins: [
      // No `set-auth-jwt` header on session reads: nobody here uses it, and it costs a key-table read per lookup.
      jwt({ disableSettingJwtHeader: true }),
      organization({
        invitationExpiresIn: 7 * DAY,
        sendInvitationEmail: async ({ id, email, organization: org }) => {
          const text = `You are invited to join ${org.name}. Invitation id: ${id}`;
          await cfg.sendEmail?.({ to: email, subject: `Join ${org.name}`, text });
        },
      }),
      mcpPlugin(cfg, adapter),
      // Passkeys (WebAuthn). The relying party id is the host of baseUrl, so a passkey made on this host works only
      // here; the browser refuses the challenge anywhere else. Registration needs a fresh session (the plugin's default).
      passkey({ rpID: new URL(cfg.baseUrl).hostname, rpName: cfg.serverName, origin: new URL(cfg.baseUrl).origin }),
      hitsPlugin(),
    ],
  };
};

/** Build the one better-auth instance: email and password, organizations, signed JWTs and the MCP OAuth provider. */
export const buildAuth = (cfg: ResolvedConfig): Auth => {
  const auth = betterAuth(authOptions(cfg, () => auth as unknown as Auth)) as unknown as Auth;
  return auth;
};
