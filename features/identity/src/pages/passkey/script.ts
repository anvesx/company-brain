/**
 * The browser side of passkeys, served at `/passkey.js`. It is plain script, no bundler: the page loads
 * `@simplewebauthn/browser` first (as `/webauthn.js`), which talks to the platform authenticator, and this file
 * drives the two round trips better-auth's passkey plugin expects: options from the server, a signed answer back.
 * Everything else (challenge cookie, session cookie, Origin check) is the server's.
 */
export const PASSKEY_SCRIPT = `(() => {
  const W = window.SimpleWebAuthnBrowser;
  const say = (message) => {
    const box = document.getElementById("passkey-error");
    box.textContent = message;
    box.hidden = false;
  };
  // One helper for both GET (options) and POST (verify). Same-origin cookies ride along; the browser adds Origin
  // to the POST, which is what the server's write guard checks.
  const call = async (path, body) => {
    const init = body
      ? { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : { credentials: "same-origin" };
    const res = await fetch("/api/auth/passkey/" + path, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Something went wrong. Try again.");
    return data;
  };
  // better-auth's own client drops clientExtensionResults before verifying; the server schema does not list it.
  const strip = ({ clientExtensionResults, ...rest }) => rest;
  const ready = () => {
    if (!W || !window.PublicKeyCredential) throw new Error("This browser cannot use passkeys.");
  };

  const signIn = document.getElementById("passkey-sign-in");
  if (signIn)
    signIn.addEventListener("click", async () => {
      try {
        ready();
        const options = await call("generate-authenticate-options");
        const response = strip(await W.startAuthentication({ optionsJSON: options }));
        await call("verify-authentication", { response });
        // Same landing as the password form: continue the OAuth request being signed into, or the connections page.
        const query = signIn.dataset.query;
        location.assign(query ? "/api/auth/oauth2/authorize?" + query : "/connections");
      } catch (error) {
        say(error.message);
      }
    });

  const add = document.getElementById("passkey-add");
  if (add)
    add.addEventListener("click", async () => {
      try {
        ready();
        const name = document.getElementById("passkey-name").value.trim();
        const options = await call("generate-register-options?name=" + encodeURIComponent(name));
        const response = await W.startRegistration({ optionsJSON: options });
        await call("verify-registration", { response, name });
        location.reload();
      } catch (error) {
        say(error.message);
      }
    });
})();
`;
