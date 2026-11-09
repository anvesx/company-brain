# Pages

Wireframes show structure. Quoted copy is exact. The server fixes error wording (identity spec); pages show it as given.

## Sign in `/sign-in`

```
Sign in
[flash.bad: error, if any]
[ Continue with Google ]     <- only when google is configured
---------- or ----------
Email [________]  Password [________]
[ Sign in ]                  <- primary
[ Sign in with a passkey ]   <- secondary      New here? Sign up
```

Divider "or". Link "Sign up". Errors: "The email or password is wrong." and "Too many attempts. Wait a few minutes and try again." Field errors sit under the field.

## Sign up `/sign-up`

```
Sign up
[ Continue with Google ]  ---- or ----
Name [____]  Email [____]  Password [____]  hint "12 to 128 characters."
[ Sign up ]   Have an account? Sign in
```

The password error shows the server reason under the field. Taken email: "An account with this email already exists. Sign in instead."

## Connections `/connections`

```
Connections          Organization: Acme  Switch  Account  [Sign out]
CONNECTORS
+--------------+ +--------------+ +- - - - - - - +
| [G] Google   | | [#] GitHub   | | [S] Slack    |
| ACTIVE       | | NEEDS SIGN IN| | NOT CONFIGURED
| ana@acme.com | | ana-acme     | | Ask an admin |  (lines: account, linked date)
| [ Unlink ]   | |[Sign in again]| | [ Connect ]  | <- disabled
+--------------+ +--------------+ +- - - - - - - +
```

One button per tile. Not linked: chip "Not linked", button "Connect". Active: chip "Active", secondary "Unlink". Needs auth: chip "Needs sign in", primary "Sign in again", line "Access ended. Sign in again to restore it." Not configured: dashed, muted, disabled "Connect", line "Not configured. Ask an admin to add the keys."
Account line: "{email or login}, linked {date}". Empty catalog: "No connectors are available yet." The install guide follows.

## Account `/account`

```
Your account                       Back to connections
Apps you allowed        NAME | ALLOWED | [ Revoke ]   <- danger
Passkeys                NAME | ADDED   | [ Delete ]   <- danger
Passkey name [This laptop]  [ Add a passkey ]         <- secondary
```

Both lists are tables. Empty apps: "You have not allowed any apps. Add the server to a client with the install guide." Empty passkeys: "No passkeys yet. A passkey lets you sign in without a password." Unnamed row: "Unnamed passkey". Passkey errors appear in a flash.bad.

## Install guide (section of `/connections`)

```
Install in your MCP client (h2) > Claude Code (h3, first) > File: ~/.claude.json
[ pre: config ................ ] [ Copy ]  <- secondary, then "Copied"
[ pre: command ............... ]   small: template note, if any
```

One block per client, Claude Code first. Intro: "Add the server to your client. Copy the block, paste it, restart the client."

## Graph `/graph` (dark, full viewport)

```
Connections (header 48px)                      [Search titles]
+-Groups-----------+                       +-Side panel-------+
| o person      42 |   black canvas        | Title            |
| o document:drive 9|  bloom, hover labels | KIND . source    |
| ... (toggles)    |                       | Connected to 12  |
+------------------+                       | - Neighbour      | [Close]
```

Legend left, 240px, one button per group, `aria-pressed`, off groups dim to 40%. Panel right, 320px, opens on click. Search top right, 280px.
Copy: "Search titles", "Groups", "Connected to {n} nodes", "Close", "Connections" (back link).
Empty: "Nothing to show yet. Connect a source on the connections page." No match: "No titles match {query}." Loading: "Loading graph". Failure: "The graph did not load. Reload the page." Paged: "Showing {n} of {total} nodes." with "Load more".
