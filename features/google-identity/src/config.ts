import type { Pool } from "pg";
import { z } from "zod";

const GOOGLE_ISSUER = "https://accounts.google.com";

const schema = z
  .object({
    baseUrl: z.url(),
    secret: z.string().min(32, "secret must be at least 32 characters"),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    /** The OIDC issuer. Google's in production; a local OIDC server in tests. */
    issuer: z.url().default(GOOGLE_ISSUER),
    production: z.boolean().default(false),
    /** Proxy addresses or CIDR ranges whose hops are skipped when reading X-Forwarded-For (Cloud Run's front end). */
    trustedProxies: z.array(z.string()).default([]),
  })
  .superRefine((cfg, ctx) => {
    if (!cfg.production) return;
    if (!cfg.baseUrl.startsWith("https://")) ctx.addIssue({ code: "custom", path: ["baseUrl"], message: "production needs an https baseUrl" });
    if (cfg.trustedProxies.length === 0) ctx.addIssue({ code: "custom", path: ["trustedProxies"], message: "production needs trustedProxies" });
  });

/** A sign-in page the app renders itself (for example with the design system), and the extra style and font sources its policy needs. */
export type SignInPage = { html: string; styleSrc?: string[]; fontSrc?: string[] };

export type IdentityInput = z.input<typeof schema> & { pool: Pool; page?: SignInPage };
export type IdentityConfig = z.output<typeof schema> & { pool: Pool; page?: SignInPage };

/** Validate the settings once at start. Throws a ZodError naming every bad field. */
export const parseConfig = ({ pool, page, ...rest }: IdentityInput): IdentityConfig => ({ ...schema.parse(rest), pool, ...(page && { page }) });
