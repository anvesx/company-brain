import { type AuthContext, type BetterAuthOptions, betterAuth, getCurrentAdapter } from "better-auth";
import { jwt, organization } from "better-auth/plugins";
import type { ResolvedConfig } from "../config.js";
import { hashPassword, verifyPassword } from "../policy/hash.js";
import { firstOrganization, hitsPlugin } from "./hooks.js";
import { mcpPlugin } from "./mcp.js";

const DAY = 86_400;

/** The slice of better-auth this package uses. Naming it keeps the plugin types out of our public signatures. */
export interface Auth {
  handler: (req: Request) => Promise<Response>;
  api: {
    getSession: (ctx: { headers: Headers }) => Promise<{ user: { id: string }; session: { id: string } } | null>;
  };
  $context: Promise<{ adapter: unknown }>;
  options: BetterAuthOptions;
}

/** Build the one better-auth instance: email and password, organizations, signed JWTs and the MCP OAuth provider. */
export const buildAuth = (cfg: ResolvedConfig): Auth => {
  // The hooks below run later, when `auth` exists. Inside a transaction this returns the transaction's adapter,
  // because SQLite has one connection and a second adapter would wait forever for it.
  const adapter = async (): Promise<AuthContext["adapter"]> =>
    getCurrentAdapter(((await auth.$context) as unknown as AuthContext).adapter) as unknown as AuthContext["adapter"];

  const auth = betterAuth({
    baseURL: cfg.baseUrl,
    secret: cfg.secret,
    database: cfg.database,
    trustedOrigins: [new URL(cfg.baseUrl).origin],
    logger: { level: "error" },
    // Our own limits (src/guard/limits.ts) replace better-auth's in-memory limiter, which does not survive a restart.
    rateLimit: { enabled: false },
    // Length is counted in code points by our own check, so better-auth's UTF-16 limits are set out of the way.
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 1,
      maxPasswordLength: 4096,
      autoSignIn: true,
      password: { hash: hashPassword, verify: ({ hash, password }) => verifyPassword(hash, password) },
    },
    session: { expiresIn: 7 * DAY },
    databaseHooks: {
      user: {
        create: {
          // Every user gets a personal organization named after them, so they always have a tenant.
          after: async (user) => {
            const org = await auth.api.createOrganization({ body: { name: user.name, slug: `p-${user.id.toLowerCase()}`, userId: user.id } });
            // The sign-up session was made before this organization existed, so point it here.
            await (await adapter()).updateMany({ model: "session", where: [{ field: "userId", value: user.id }], update: { activeOrganizationId: org?.id } });
          },
        },
      },
      session: {
        create: {
          // A new session starts in the user's first organization.
          before: async (session) => ({ data: { ...session, activeOrganizationId: await firstOrganization(await adapter(), session.userId) } }),
        },
      },
    },
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
      hitsPlugin(),
    ],
  });
  return auth as unknown as Auth;
};
