import { Hono } from "hono";
import { consentView as readConsent } from "../consent/view.js";
import { authenticate, type Deps, html, redirect } from "./actions.js";
import { mountForms } from "./forms.js";
import { mountAccount } from "./signed/account.js";
import { mountConnections } from "./signed/connections.js";
import { queryOf, signedInPages } from "./signed/guard.js";
import { signInView, signUpView } from "./views/auth.js";
import { consentView, pickerView } from "./views/flow.js";

/** The server-rendered pages and the form posts behind them. Forms use the JSON API through `call`, so its guards apply. */
export const buildPages = (d: Deps): Hono => {
  const app = new Hono();
  const pages = signedInPages(d);
  const { adapter, signedIn } = pages;

  app.get("/", () => redirect("/connections"));
  app.get("/sign-in", (c) => html(signInView({ query: queryOf(c.req.url) })));
  app.get("/sign-up", (c) => html(signUpView({ query: queryOf(c.req.url) })));
  app.post("/sign-in", (c) => authenticate(d, c.req.raw, "sign-in"));
  app.post("/sign-up", (c) => authenticate(d, c.req.raw, "sign-up"));

  app.get(
    "/picker",
    signedIn(async (req, view, token) => {
      const db = await adapter();
      const members = await db.findMany<{ organizationId: string }>({ model: "member", where: [{ field: "userId", value: view.userId }] });
      const found = await Promise.all(
        members.map((m) => db.findOne<{ id: string; name: string }>({ model: "organization", where: [{ field: "id", value: m.organizationId }] })),
      );
      return html(
        pickerView(
          found.flatMap((org) => (org ? [org] : [])),
          token,
          queryOf(req.url),
        ),
      );
    }),
  );

  app.get(
    "/consent",
    signedIn(async (req, _view, token) =>
      html(consentView(await readConsent(d.auth, await adapter(), req.headers, queryOf(req.url)), token, queryOf(req.url))),
    ),
  );

  mountConnections(app, d, pages);
  mountAccount(app, d, pages);
  mountForms(app, d);
  return app;
};
