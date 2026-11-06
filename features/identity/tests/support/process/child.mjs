// One separate node process that opens the same SQLite file as the test and refreshes one account.
// It uses the built package (dist), the way a second replica would. Everything arrives in env vars.
import { createIdentity, openSqlite } from "../../../dist/index.js";

const e = process.env;
const identity = createIdentity({
  baseUrl: e.BASE_URL,
  resource: `${e.BASE_URL}/mcp`,
  secret: e.AUTH_SECRET,
  sealKey: e.SEAL_KEY,
  database: openSqlite(e.DATABASE_PATH),
  providers: JSON.parse(e.PROVIDERS),
  env: e,
});
await identity.adapter();
try {
  await identity.refreshAccount(e.ACCOUNT_ID);
  console.log("refreshed");
} catch (error) {
  console.log(error.code ?? String(error));
}
process.exit(0);
