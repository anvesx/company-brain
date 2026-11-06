import { googleButton } from "../../login/google.js";
import { esc, field, hidden, page } from "../layout.js";
import { PASSKEY_SCRIPTS, passkeySignIn } from "../passkey/view.js";

export interface AuthForm {
  /** The OAuth query to continue after sign-in, empty for a plain visit. */
  query: string;
  error?: string;
  /** The email the person typed, put back in the box after a refused post. */
  email?: string;
  /** Show the Continue with Google button. */
  google?: boolean;
}

/** What the page says for the `error` code a failed Google sign-in comes back with. Unknown codes get the generic line. */
const CODES: Record<string, string> = {
  email_not_verified: "Google says this email is not verified, so we cannot sign you in with it. Verify it with Google and try again.",
  account_not_linked: "That account is not linked to a person here. Sign in with your email and password, then connect it.",
};

/** Splits a page URL into the OAuth query to carry on and the message for any `error` code, so the code never rides along. */
export const readQuery = (url: string): { query: string; error?: string } => {
  const params = new URL(url).searchParams;
  const code = params.get("error");
  params.delete("error");
  params.delete("error_description");
  return { query: params.toString(), ...(code ? { error: CODES[code] ?? "Sign-in did not finish. Try again." } : {}) };
};

const withGoogle = (google?: boolean): string => (google ? `${googleButton()}\n` : "");

const alert = (error?: string): string => (error ? `<p role="alert">${esc(error)}</p>` : "");

/** The sign-in page. The form posts to the server; the passkey button below it is the one script, loaded as files. */
export const signInView = ({ query, error, email, google }: AuthForm): string =>
  page(
    "Sign in",
    `${alert(error)}<form method="post" action="/sign-in">${hidden({ oauth_query: query })}
${field("Email", "email", "email", "username", email)}${field("Password", "password", "password", "current-password")}
<button type="submit">Sign in</button></form>
${withGoogle(google)}${passkeySignIn(query)}<p>New here? <a href="/sign-up${query ? `?${esc(query)}` : ""}">Sign up</a></p>${PASSKEY_SCRIPTS}`,
  );

/** The sign-up page. The server checks the password against the breached list and shows the reason here. */
export const signUpView = ({ query, error, email, google }: AuthForm): string =>
  page(
    "Sign up",
    `${alert(error)}<form method="post" action="/sign-up">${hidden({ oauth_query: query })}
${field("Name", "name", "text", "name")}${field("Email", "email", "email", "username", email)}${field("Password", "password", "password", "new-password")}
<button type="submit">Sign up</button></form>
${withGoogle(google)}<p>Have an account? <a href="/sign-in${query ? `?${esc(query)}` : ""}">Sign in</a></p>`,
  );
