# passkey (e2e)

Rule 16 in a real Chromium with a virtual authenticator (CDP `WebAuthn.addVirtualAuthenticator`:
platform, discoverable credentials, user verified, presence simulated). No real passkey and no
Touch ID prompt is involved, so the run is unattended. `passkey.test.ts`: add a passkey on the
account page, sign out, sign in with it, delete it; and a failed sign-in with no passkey stays on
the page with the error shown. Screenshots go to `shots/`.
