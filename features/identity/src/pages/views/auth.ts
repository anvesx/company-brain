import { esc, field, hidden, page } from "../layout.js";
import { PASSKEY_SCRIPTS, passkeySignIn } from "../passkey/view.js";

export interface AuthForm {
  /** The OAuth query to continue after sign-in, empty for a plain visit. */
  query: string;
  error?: string;
  /** The email the person typed, put back in the box after a refused post. */
  email?: string;
}

const alert = (error?: string): string => (error ? `<p role="alert">${esc(error)}</p>` : "");

/** The sign-in page. The form posts to the server; the passkey button below it is the one script, loaded as files. */
export const signInView = ({ query, error, email }: AuthForm): string =>
  page(
    "Sign in",
    `${alert(error)}<form method="post" action="/sign-in">${hidden({ oauth_query: query })}
${field("Email", "email", "email", "username", email)}${field("Password", "password", "password", "current-password")}
<button type="submit">Sign in</button></form>
${passkeySignIn(query)}<p>New here? <a href="/sign-up${query ? `?${esc(query)}` : ""}">Sign up</a></p>${PASSKEY_SCRIPTS}`,
  );

/** The sign-up page. The server checks the password against the breached list and shows the reason here. */
export const signUpView = ({ query, error, email }: AuthForm): string =>
  page(
    "Sign up",
    `${alert(error)}<form method="post" action="/sign-up">${hidden({ oauth_query: query })}
${field("Name", "name", "text", "name")}${field("Email", "email", "email", "username", email)}${field("Password", "password", "password", "new-password")}
<button type="submit">Sign up</button></form>
<p>Have an account? <a href="/sign-in${query ? `?${esc(query)}` : ""}">Sign in</a></p>`,
  );
