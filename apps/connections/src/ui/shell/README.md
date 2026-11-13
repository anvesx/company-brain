# ui/shell

The frame every page shares.

- `layout.tsx`: `Shell` renders the design-system `Document` with the left rail, the top bar (signed-in email and Sign out) and the page notice. Rail entries for screens that do not exist yet are disabled text marked "Soon", never links.
- `css.ts`: the app's own styles, built only from design-system tokens and served at `/ui/app.css`. It adds the rail, the status dot, the health strip and the phone layout. No shadows, one accent.
- `status.tsx`: `Status` (a dot and the state in words) and `Notice` (the success or error line after a redirect).
- `notes.ts`: `noteOf` turns the query a redirect carries into a `Note`: a fixed sentence for `notice`, and for `error` and `oauth_error` a lookup of a fixed code (anything unknown reads "The request failed."). `codeOf` maps a `/v1` status to that code. No query text is ever shown.
