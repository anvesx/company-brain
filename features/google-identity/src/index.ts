import { getMigrations } from "better-auth/db/migration";
import { buildApp } from "./app.js";
import { authOptions, buildAuth } from "./auth.js";
import { type IdentityInput, parseConfig } from "./config.js";

export { OPEN_ROUTES } from "./app.js";
export type { IdentityConfig, IdentityInput } from "./config.js";

/** Create the better-auth tables (user, account, session, verification, rateLimit) in Postgres. Run before serving. */
export const migrateIdentity = async (input: IdentityInput): Promise<void> => {
  await (await getMigrations(authOptions(parseConfig(input)))).runMigrations();
};

/** Build Google-only sign-in. `app.fetch` is the web handler; `auth.api.getSession({ headers })` tells other apps who is calling. */
export const createGoogleIdentity = (input: IdentityInput) => {
  const cfg = parseConfig(input);
  const auth = buildAuth(cfg);
  return { auth, app: buildApp(auth, cfg) };
};
